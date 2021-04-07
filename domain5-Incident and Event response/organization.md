# AWS Organizations  

Công cụ của AWS cho phép quản lí nhiều tài khoản AWS. 

## organizational units (OU)

Nhóm các accounts thành các group. Như các nhóm prod, dev, test, ... Từ đó, có thể dễ dàng attach policy. 

## Service Control policies  

+ Whilelist hoặc blacklist IAM actions
+ tác dụng tới OU hoặc account level
+ Không áp dụng với master account
+ Không tác dụng tới service-link roles
+ Mặc định là deny
+ Usecases :  
  + Hạn chế quyền truy cập tới tài nguyên chỉ định
  