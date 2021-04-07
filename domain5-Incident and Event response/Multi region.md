# Multi region  

## Stacksets  

Nếu muốn chạy cloudformation cho nhiều tài khoản trên nhiều region khác nhau có thể dùng Stacksets.  
Ta sẽ tạo stacksets trong admin accounts. Sau đó, tại các tài khoản con, cần phải tạo một service role để tin tưởng admin accounts, sau đó mới có thể tạo stack sets.  
Khi update stacksets, trên các tài khoản khác cũng sẽ thay đổi.  

