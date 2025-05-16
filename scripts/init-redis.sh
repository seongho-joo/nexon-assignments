#!/bin/sh

echo "Redis initialization script starting..."

# 비밀번호가 필요한 경우
REDIS_PASSWORD="example"

# 초기 데이터 설정
redis-cli -a $REDIS_PASSWORD SADD "authorization:USER:POST" "/request"
redis-cli -a $REDIS_PASSWORD SADD "authorization:USER:GET" "/request" "/events" "/rewards"
redis-cli -a $REDIS_PASSWORD SADD "authorization:OPERATOR:POST" "/events" "/rewards"
redis-cli -a $REDIS_PASSWORD SADD "authorization:OPERATOR:GET" "/events" "/rewards"
redis-cli -a $REDIS_PASSWORD SADD "authorization:AUDITOR:GET" "/requests/histories"
redis-cli -a $REDIS_PASSWORD SADD "authorization:ADMIN:GET" "/*"
redis-cli -a $REDIS_PASSWORD SADD "authorization:ADMIN:POST" "/*"

echo "Redis initialization complete." 