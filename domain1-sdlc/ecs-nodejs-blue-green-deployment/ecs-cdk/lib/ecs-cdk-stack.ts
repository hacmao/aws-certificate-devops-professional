import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ecr from '@aws-cdk/aws-ecr';
import * as logs from "@aws-cdk/aws-logs";
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns';
import { Duration, Tag } from '@aws-cdk/core';

// https://qiita.com/nyasba/items/48bf95ee66794a608822

export class EcsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =====================================================================
    // Use default vpc value
    // =====================================================================
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-b650add0'
    });

    // =====================================================================
    // Load balancer
    // =====================================================================
    const elb = new elbv2.ApplicationLoadBalancer(this, 'alb', {
      loadBalancerName: 'alb-nodejs',
      vpc: vpc,
      internetFacing: true
    })

    const albTargetGroup = new elbv2.ApplicationTargetGroup(this, 'albTargetGroup', {
      vpc: vpc,
      targetGroupName: 'alb-nodejs-tg2',
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      healthCheck: { path: '/health'},
    });

    elb.addListener('alb-listener', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      defaultTargetGroups: [ albTargetGroup ]
    });

    // =====================================================================
    // Create ecs task role and execution role
    // =====================================================================
    const taskExecutionRole = iam.Role.fromRoleArn(this, 'taskExecutionRole', `arn:aws:iam::${this.account}:role/ecsTaskExecutionRole`);
    const taskRole = iam.Role.fromRoleArn(this, 'taskRole', `arn:aws:iam::${this.account}:role/ecsTaskRoleS3FullAccess`);

    // =====================================================================
    // Create ecs cluster
    // =====================================================================
    const cluster = new ecs.Cluster(this, 'ecs-blue-green-cluster', {
      clusterName: 'ecs-blue-green-cluster',
      vpc: vpc,
    });
    
    const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      executionRole: taskExecutionRole,
      taskRole: taskRole,
      memoryLimitMiB: 1024,
      cpu: 512
    });

    // const repo = new ecs.RepositoryImage('ecs-blue-green-nodejs');
    const repo = ecr.Repository.fromRepositoryName(this, 'repo', 'ecs-blue-green-nodejs');

    // const appLogGroup = new logs.LogGroup(this, 'LogGroup', {
    //   retention: logs.RetentionDays.ONE_WEEK,
    //   logGroupName: 'ecs-nodejs'
    // });

    const appLogGroup = logs.LogGroup.fromLogGroupArn(this, 'LogGroup', 'arn:aws:logs:ap-southeast-1:341546619470:log-group:ecs-nodejs:*');

    const container = fargateTaskDefinition.addContainer('NodejsApp', {
      image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
      portMappings: [ { containerPort: 3000, protocol: ecs.Protocol.TCP }],
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: '/ecs/nodejs-app/',
        logGroup: appLogGroup
      })
    });
    

    // =====================================================================
    // Service
    // =====================================================================
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ecs-sg', {
      securityGroupName: 'ecs-sg',
      vpc: vpc
    })
    ecsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    ecsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080));

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: fargateTaskDefinition,
      assignPublicIp: true,
      desiredCount: 1,
      serviceName: 'nodejs-service',
      deploymentController: { type:ecs.DeploymentControllerType.ECS },
      securityGroup: ecsSecurityGroup,
      healthCheckGracePeriod: Duration.minutes(2),
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC
      }),
    });


    albTargetGroup.addTarget(service.loadBalancerTarget({
      containerName: container.containerName,
      containerPort: container.containerPort,

    }));
  }
}
