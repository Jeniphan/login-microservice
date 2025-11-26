# AI_RULES.md - NestJS TBD Template

ไฟล์นี้ประกอบด้วยกฎและแนวทางสำหรับการพัฒนาแอปพลิเคชันด้วย NestJS Template ซึ่งรวมไปถึงข้อกำหนดด้าน Code Structure, Framework, Documentation, Testing, Security และ Code Coverage

## 📋 โครงสร้างโปรเจค (Project Structure)

### Root Structure
```
source-code/
├── src/                    # โค้ดหลักของแอปพลิเคชัน
│   ├── main.ts            # Entry point ของแอปพลิเคชัน
│   ├── app.module.ts      # Root module
│   ├── app.controller.ts  # Root controller
│   ├── common/            # คลาสและฟังก์ชันที่ใช้ร่วมกัน
│   ├── database/          # การตั้งค่าฐานข้อมูล
│   ├── dto/              # Data Transfer Objects
│   ├── helper/           # Helper functions และ utilities
│   ├── lib/              # ไลบรารีและเซอร์วิสภายนอก
│   ├── application/      # Application guards และ middleware
│   └── validation/       # Schema validation
├── test/                 # E2E tests
├── coverage/            # Code coverage reports (auto-generated)
├── dist/               # Compiled output (auto-generated)
└── node_modules/       # Dependencies (auto-generated)
```

### Source Code Organization
- **Controllers**: จัดการ HTTP requests และ responses
- **Services**: Business logic และ data processing
- **Modules**: จัดกลุ่ม controllers, services, และ providers
- **DTOs**: Define data structure สำหรับ input/output
- **Entities**: Database models (TypeORM entities)
- **Guards**: Authentication และ authorization
- **Interceptors**: Request/response transformation
- **Filters**: Exception handling

## 🚀 Framework และ Technology Stack

### Core Framework
- **NestJS 11.x**: Progressive Node.js framework
- **TypeScript 5.8+**: Strongly typed JavaScript
- **Fastify**: High performance web framework (แทน Express)

### Database & Caching
- **TypeORM 0.3+**: Object-Relational Mapping
- **PostgreSQL**: Primary database
- **Redis**: Caching layer with Keyv-Redis

### Validation & Security
- **Zod 3.x**: Schema validation
- **Class Validator**: DTO validation
- **JWT**: Authentication tokens
- **Passport-JWT**: JWT strategy

### Testing
- **Jest 29.x**: Testing framework
- **Supertest**: HTTP assertion library
- **@nestjs/testing**: NestJS testing utilities

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks (optional)

## 🏗️ Code Structure Standards

### 1. File Naming Conventions
```
- Controllers: *.controller.ts
- Services: *.service.ts
- Modules: *.module.ts
- DTOs: *.dto.ts
- Entities: *.entity.ts
- Guards: *.guard.ts
- Interceptors: *.interceptor.ts
- Filters: *.filter.ts
- Helpers: *.helper.ts
- Tests: *.spec.ts (unit), *.e2e-spec.ts (e2e)
```

### 2. Import Path Aliases
```typescript
// ใช้ path aliases ตาม tsconfig.json
import { SomeEntity } from '@entities/some.entity';
import { SomeService } from '@services/some.service';
import { SomeDto } from '@dto/some.dto';
import { SomeHelper } from '@helper/some.helper';
```

### 3. Class และ Interface Naming
```typescript
// Classes: PascalCase
export class UserService {}
export class UserController {}

// Interfaces: เริ่มต้นด้วย I + PascalCase
export interface IUserRepository {}
export interface IAdvanceQuery {}

// DTOs: PascalCase + Dto suffix
export class CreateUserDto {}
export class UpdateUserDto {}
```

### 4. Method และ Variable Naming
```typescript
// Methods: camelCase
async getUserById(id: string) {}
async createNewUser(userData: CreateUserDto) {}

// Variables: camelCase
const applicationId = 'app-123';
const userRepository = this.getRepository(User);

// Constants: UPPER_SNAKE_CASE
const ENTITY_MANAGER_KEY = 'ENTITY_MANAGER';
const DEFAULT_PAGE_SIZE = 10;
```

## 📝 Documentation Standards

### 1. Code Comments
```typescript
/**
 * Service สำหรับจัดการข้อมูล User
 * รวมไปถึงการ authentication และ authorization
 */
@Injectable()
export class UserService {
  /**
   * ดึงข้อมูล User ตาม ID
   * @param id - User ID ในรูปแบบ UUID
   * @param options - ตัวเลือกเพิ่มเติมสำหรับ query
   * @returns Promise<User> - ข้อมูล User หรือ null
   */
  async findById(id: string, options?: IOptionCustomQuery): Promise<User | null> {
    // Implementation
  }
}
```

### 2. API Documentation (Swagger)
```typescript
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  
  @ApiOperation({ 
    summary: 'ดึงรายการ User ทั้งหมด',
    description: 'API สำหรับดึงรายการ User พร้อม filtering และ pagination' 
  })
  @ApiResponse({
    status: 200,
    description: 'ดึงข้อมูลสำเร็จ',
    schema: {
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        result: { 
          type: 'object',
          properties: {
            data: { type: 'array' },
            total: { type: 'number' },
            currentPage: { type: 'number' }
          }
        }
      }
    }
  })
  @Get()
  async getUsers(@Query() query: IAdvanceQuery) {
    // Implementation
  }
}
```

### 3. README Documentation
- Installation instructions
- Environment setup
- API endpoints documentation
- Database migration guides
- Deployment instructions

## 🧪 Testing Requirements

### 1. Unit Testing Standards
```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: MockType<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory
        }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
    mockRepository = module.get(getRepositoryToken(User));
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: '123', name: 'Test User' };
      mockRepository.findOne.mockReturnValue(user);
      
      const result = await service.findById('123');
      
      expect(result).toEqual(user);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockReturnValue(null);
      
      const result = await service.findById('999');
      
      expect(result).toBeNull();
    });
  });
});
```

### 2. E2E Testing Standards
```typescript
describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (GET) should return users list', () => {
    return request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 200);
        expect(res.body).toHaveProperty('message', 'success');
        expect(res.body.result).toHaveProperty('data');
      });
  });
});
```

### 3. Test Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Critical Paths**: 90% coverage
- **Services**: 85% coverage minimum
- **Controllers**: 75% coverage minimum
- **Utilities/Helpers**: 90% coverage minimum

### 4. Coverage Exclusions (ตาม package.json)
```json
"coveragePathIgnorePatterns": [
  ".*\\.module\\.(js|ts)$",
  ".*\\.dto\\.(js|ts)$", 
  ".*\\.entity\\.(js|ts)$",
  ".*\\.filter\\.(js|ts)$",
  "main.ts",
  "/common/.*"
]
```

## 🔒 Security Requirements

### 1. Authentication & Authorization
```typescript
// ใช้ ApplicationGuard สำหรับ API endpoints
@ApiBearerAuth()
@UseGuards(ApplicationGuard)
@Controller('users')
export class UserController {
  // Protected endpoints
}

// JWT Token validation
@Injectable()
export class ApplicationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Token verification logic
    // Application ID extraction
    // Permission validation
  }
}
```

### 2. Input Validation & Sanitization
```typescript
// ใช้ Zod สำหรับ schema validation
export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});

// DTO validation
export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}
```

### 3. Error Handling & Security
```typescript
// Global exception filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // ไม่เปิดเผยข้อมูลระบบใน error messages
    // Log errors สำหรับ monitoring
    // Return standardized error format
  }
}

// API Response wrapper
export default class ApiResponse {
  public error(err: unknown) {
    // Sanitize error messages
    // Log security events
    // Return safe error responses
  }
}
```

## 🛡️ SonarQube Integration

### 1. Code Quality Gates
- **Coverage**: >= 80%
- **Duplicated Lines**: < 3%
- **Maintainability Rating**: A
- **Reliability Rating**: A
- **Security Rating**: A

### 2. Security Hotspots
- SQL Injection prevention (ใช้ TypeORM parameterized queries)
- XSS prevention (input validation & sanitization)
- CSRF protection (stateless JWT authentication)
- Sensitive data exposure prevention

### 3. Code Smells ที่ต้องหลีกเลี่ยง
```typescript
// ❌ Bad: Hard-coded credentials
const connectionString = 'postgres://user:pass@localhost:5432/db';

// ✅ Good: Environment variables
const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// ❌ Bad: Unused imports/variables
import { UnusedService } from './unused.service';
const unusedVariable = 'test';

// ✅ Good: Clean imports
import { RequiredService } from './required.service';

// ❌ Bad: Complex functions
public async complexFunction(data: any): Promise<any> {
  // 100+ lines of code
}

// ✅ Good: Single responsibility
public async validateUser(userData: CreateUserDto): Promise<ValidationResult> {
  // 10-20 lines focused on validation
}
```

## 🔍 Checkmarx Integration

### 1. Static Application Security Testing (SAST)
- **Vulnerability Scanning**: ทุก commit ไปยัง main branch
- **Security Rules**: ตาม OWASP Top 10
- **Critical Issues**: ต้องแก้ไขก่อน merge

### 2. Secure Coding Practices
```typescript
// ✅ Parameterized queries (TypeORM)
async findUserByEmail(email: string): Promise<User> {
  return this.userRepository.findOne({
    where: { email: email } // Safe parameterized query
  });
}

// ✅ Input validation
async createUser(userData: CreateUserDto): Promise<User> {
  const validatedData = CreateUserSchema.parse(userData);
  return this.userRepository.save(validatedData);
}

// ✅ Secure configuration
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,      // Remove unknown properties
  forbidNonWhitelisted: true, // Throw error for unknown properties
  transform: true       // Transform input to DTO type
}));
```

### 3. Security Headers & HTTPS
```typescript
// Security middleware configuration
app.use(helmet()); // Security headers
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});
```

## 📊 Code Coverage Requirements

### 1. Coverage Thresholds
```json
// Jest configuration for coverage
"jest": {
  "collectCoverageFrom": [
    "**/*.(t|j)s"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80, 
      "lines": 80,
      "statements": 80
    }
  }
}
```

### 2. Testing Strategy
- **Unit Tests**: ทุก service methods, helper functions
- **Integration Tests**: Database operations, external API calls
- **E2E Tests**: Critical user journeys, API endpoints
- **Contract Tests**: DTO validations, API schemas

### 3. Coverage Reports
```bash
# Generate coverage report
pnpm run test:cov

# Coverage formats
- HTML report: coverage/lcov-report/index.html
- JSON report: coverage/coverage-final.json
- LCOV format: coverage/lcov.info
```

## 🚀 CI/CD Pipeline Requirements

### 1. Pre-commit Hooks
```bash
# Install dependencies
pnpm install

# Lint code
pnpm run lint

# Format code  
pnpm run format

# Run tests
pnpm run test

# Run security scan
pnpm audit
```

### 2. Build Pipeline
```yaml
# GitHub Actions / GitLab CI example
steps:
  - name: Install dependencies
    run: pnpm install --frozen-lockfile
    
  - name: Lint code
    run: pnpm run lint
    
  - name: Run tests with coverage
    run: pnpm run test:cov
    
  - name: SonarQube analysis
    run: sonar-scanner
    
  - name: Checkmarx scan
    run: checkmarx-scan
    
  - name: Build application
    run: pnpm run build
    
  - name: Security audit
    run: pnpm audit --audit-level high
```

### 3. Quality Gates
- ✅ All tests passing
- ✅ Coverage >= 80%
- ✅ No high/critical security vulnerabilities
- ✅ SonarQube quality gate passed
- ✅ Checkmarx scan passed
- ✅ No ESLint errors
- ✅ Code properly formatted

## 📦 Environment & Configuration

### 1. Environment Variables
```bash
# Application
NODE_ENV=develop|staging|production
PORT=3000
PREFIX=template

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=username
DB_PASSWORD=password
DB_NAME=database_name

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USER=username
REDIS_PASSWORD=password
REDIS_TTL=3600

# External Services
ENDPOINT_APPLICATION_MS=https://api.example.com
```

### 2. Configuration Validation
```typescript
// Validate environment variables on startup
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().transform(Number),
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().transform(Number),
  // ... other required env vars
});

const config = configSchema.parse(process.env);
```

## 🔄 API Standards

### 1. Response Format
```typescript
// Standard API response structure
interface ApiResponse<T> {
  status: number;      // HTTP status code
  message: string;     // Response message
  result: T | null;    // Data payload
}

// Success response
{
  "status": 200,
  "message": "success",
  "result": {
    "data": [...],
    "total": 100,
    "currentPage": 1
  }
}

// Error response  
{
  "status": 400,
  "message": "Bad Request",
  "result": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 2. HTTP Status Codes
- **200 OK**: Successful GET, PUT, PATCH
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **500 Internal Server Error**: Server errors

## 🗃️ Database Standards

### 1. Entity Design
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

### 2. Migration Standards
```typescript
// Migration naming: timestamp_description.ts
// Example: 1640995200000_CreateUsersTable.ts

export class CreateUsersTable1640995200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table logic
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback logic
  }
}
```

## 📈 Performance Standards

### 1. Response Time Targets
- **API Endpoints**: < 200ms (95th percentile)
- **Database Queries**: < 100ms (average)
- **Cache Operations**: < 10ms (average)

### 2. Optimization Techniques
- Database query optimization
- Redis caching implementation
- Connection pooling
- Lazy loading for relations
- Pagination for large datasets

## ⚠️ Error Handling Standards

### 1. Exception Hierarchy
```typescript
// Custom exceptions
export class BusinessLogicException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, HttpStatus.NOT_FOUND);
  }
}
```

### 2. Logging Standards
```typescript
// Structured logging
@Injectable()
export class LoggerService {
  private readonly logger = new Logger(LoggerService.name);

  logError(error: Error, context: string, metadata?: any) {
    this.logger.error({
      message: error.message,
      stack: error.stack,
      context,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🎯 Code Review Checklist

### 1. Code Quality
- [ ] Code follows naming conventions
- [ ] Functions have single responsibility
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Adequate test coverage

### 2. Security
- [ ] Input validation implemented
- [ ] No hardcoded credentials
- [ ] Proper authentication/authorization
- [ ] SQL injection prevention
- [ ] XSS prevention

### 3. Performance
- [ ] Efficient database queries
- [ ] Proper caching implementation
- [ ] No memory leaks
- [ ] Optimized imports

### 4. Documentation
- [ ] Code comments where necessary
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Migration scripts documented

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Jest Testing Framework](https://jestjs.io/)
- [SonarQube Rules](https://rules.sonarsource.com/)
- [OWASP Security Guidelines](https://owasp.org/)

---

**หมายเหตุ**: กฎและแนวทางเหล่านี้จะต้องปฏิบัติตามอย่างเคร่งครัดเพื่อให้มั่นใจในคุณภาพ ความปลอดภัย และความเสถียรของระบบ