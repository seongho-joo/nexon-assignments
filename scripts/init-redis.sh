#!/bin/sh

echo "Redis initialization script starting..."

# 비밀번호가 필요한 경우
REDIS_PASSWORD="Admin123!"

# 초기 데이터 설정
redis-cli -a $REDIS_PASSWORD SADD "authorization:USER:POST" "/api/requests"
redis-cli -a $REDIS_PASSWORD SADD "authorization:USER:GET" "/api/users/:userId/requests" "/api/users/:userId/requests/:requestId" "/api/events" "/api/events/:eventId/rewards" "/api/events/:eventId" "/api/users/:userId/point-transactions"
redis-cli -a $REDIS_PASSWORD SADD "authorization:OPERATOR:POST" "/api/events" "/api/rewards"
redis-cli -a $REDIS_PASSWORD SADD "authorization:OPERATOR:GET" "/api/users/:userId/requests" "/api/users/:userId/requests/:requestId" "/api/requests" "/api/requests/:requestId" "/api/events" "/api/events/:eventId/rewards"  "/api/events/:eventId" "/api/users/:userId/point-transactions"
redis-cli -a $REDIS_PASSWORD SADD "authorization:AUDITOR:GET" "/api/users/:userId/requests" "/api/users/:userId/requests/:requestId" "/api/requests" "/api/requests/:requestId" "/api/users/:userId/point-transactions"
redis-cli -a $REDIS_PASSWORD SADD "authorization:ADMIN:GET" "/*"
redis-cli -a $REDIS_PASSWORD SADD "authorization:ADMIN:POST" "/*"

echo "Redis initialization complete." 