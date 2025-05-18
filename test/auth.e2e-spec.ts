import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GatewayModule } from '@app/gateway/gateway.module';
import { AuthModule } from '@app/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { UserRole } from '@app/common/schemas';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

describe('Auth Domain (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
        }),
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/test_db',
          }),
        }),
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            store: redisStore,
            url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
            ttl: 60 * 60 * 24,
          }),
        }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: {
              expiresIn: '1h',
            },
          }),
        }),
        GatewayModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Clean up database before tests
    const mongoConnection = moduleFixture.get('DatabaseConnection');
    await mongoConnection.collection('users').deleteMany({});
    await mongoConnection.collection('roles').deleteMany({});

    // 관리자 계정 생성 및 로그인
    const adminSignup = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({
        username: 'admin',
        password: 'admin123!@#',
        role: UserRole.ADMIN,
      })
      .query({ adminKey: process.env.ADMIN_KEY || 'test-admin-key' });

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      username: 'admin',
      password: 'admin123!@#',
    });

    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up database after tests
    const mongoConnection = app.get('DatabaseConnection');
    await mongoConnection.collection('users').deleteMany({});
    await mongoConnection.collection('roles').deleteMany({});

    await app.close();
  });

  describe('Sign Up (POST /auth/sign-up)', () => {
    it('Successfully registers a normal user', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          username: 'testuser',
          password: 'test123!@#',
          role: UserRole.USER,
        })
        .expect(201)
        .expect(res => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.message).toBe('User registered successfully');
          expect(res.body.data.userId).toBeDefined();
          userId = res.body.data.userId;
        });
    });

    it('Fails to register with duplicate username', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          username: 'testuser',
          password: 'test123!@#',
          role: UserRole.USER,
        })
        .expect(400)
        .expect(res => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBe('Username already exists');
        });
    });

    it('Fails to register as ADMIN without admin key', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({
          username: 'admin2',
          password: 'admin123!@#',
          role: UserRole.ADMIN,
        })
        .expect(400)
        .expect(res => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBe('Admin key is required for admin registration.');
        });
    });
  });

  describe('Login (POST /auth/login)', () => {
    it('Successfully logs in with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'test123!@#',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.message).toBe('Login successful');
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.user.username).toBe('testuser');
          expect(res.body.data.user.role).toBe(UserRole.USER);
        });
    });

    it('Fails to login with incorrect password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect(res => {
          expect(res.body.statusCode).toBe(401);
          expect(res.body.message).toBe('Invalid credentials');
        });
    });
  });

  describe('User Role Management (PUT /auth/user-role)', () => {
    it('Admin successfully changes user role to OPERATOR', () => {
      return request(app.getHttpServer())
        .put(`/auth/user-role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          newRole: UserRole.OPERATOR,
        })
        .expect(200)
        .expect(res => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.message).toBe('User role updated successfully');
          expect(res.body.data.role).toBe(UserRole.OPERATOR);
        });
    });

    it('Fails to change role without authorization', () => {
      return request(app.getHttpServer())
        .put(`/auth/user-role`)
        .send({
          userId,
          newRole: UserRole.AUDITOR,
        })
        .expect(401);
    });

    it('Fails to change role for non-existent user', () => {
      return request(app.getHttpServer())
        .put(`/auth/user-role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'non-existent-id',
          newRole: UserRole.OPERATOR,
        })
        .expect(400)
        .expect(res => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBe('User not found');
        });
    });
  });

  describe('Role Permission Management', () => {
    it('Admin successfully adds permission to role', () => {
      return request(app.getHttpServer())
        .post('/auth/role-permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.OPERATOR,
          method: 'GET',
          path: '/api/events',
          allow: true,
        })
        .expect(200)
        .expect(res => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.message).toBe('Role permission added successfully');
        });
    });

    it('Admin successfully retrieves role permissions', () => {
      return request(app.getHttpServer())
        .get('/auth/role-permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          role: UserRole.OPERATOR,
          method: 'GET',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.message).toBe('Role permissions retrieved successfully');
          expect(res.body.data).toHaveProperty('GET');
          expect(Array.isArray(res.body.data.GET)).toBe(true);
          expect(res.body.data.GET).toContain('/api/events');
        });
    });

    it('Admin successfully removes permission from role', () => {
      return request(app.getHttpServer())
        .delete('/auth/role-permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.OPERATOR,
          method: 'GET',
          path: '/api/events',
        })
        .expect(200)
        .expect(res => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.message).toBe('Role permission removed successfully');
        });
    });
  });
});
