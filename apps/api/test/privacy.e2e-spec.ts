import * as fs from 'fs';
import * as path from 'path';

describe('Privacy Regression Tests (Zero-File Server Compliance)', () => {
  const apiRoot = path.resolve(__dirname, '..');

  it('should not contain file-upload libraries in package.json dependencies', () => {
    interface PkgJson {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }
    const packageJsonPath = path.join(apiRoot, 'package.json');
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8'),
    ) as PkgJson;

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const forbiddenDeps = [
      'multer',
      'busboy',
      'formidable',
      'multer-s3',
      'aws-sdk',
      '@aws-sdk/client-s3',
    ];
    forbiddenDeps.forEach((dep) => {
      expect(dependencies).not.toHaveProperty(dep);
    });
  });

  it('should not contain file, document, or binary storage tables in Prisma schema', () => {
    const schemaPath = path.join(apiRoot, 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Forbidden table/model names
    const forbiddenModels = [
      'file',
      'document',
      'pdf',
      'attachment',
      'upload',
      'storage',
      'blob',
    ];
    forbiddenModels.forEach((model) => {
      // Look for "model Name {" or "model name {" case-insensitively
      const regex = new RegExp(`model\\s+${model}\\s*\\{`, 'i');
      expect(schemaContent).not.toMatch(regex);
    });
  });

  it('should not define file processing or upload endpoints in controller files', () => {
    const srcDir = path.join(apiRoot, 'src');

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.controller.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for @Post('upload'), @Post('process-pdf'), FileInterceptor, etc.
          expect(content).not.toMatch(/@Post\(['"]upload['"]\)/i);
          expect(content).not.toMatch(/@Post\(['"]process-pdf['"]\)/i);
          expect(content).not.toMatch(/@Post\(['"]process-image['"]\)/i);
          expect(content).not.toMatch(/FileInterceptor/i);
          expect(content).not.toMatch(/UploadedFile/i);
        }
      });
    }

    scanDir(srcDir);
  });

  it('should verify that ErrorReport DTOs and Telemetry DTOs do not contain filename or content fields', () => {
    const srcDir = path.join(apiRoot, 'src');

    function scanDtoDir(dir: string) {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDtoDir(fullPath);
        } else if (file.endsWith('.dto.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for filename, file_name, fileContent, pdfContent, etc.
          expect(content).not.toMatch(/\bfilename\b/i);
          expect(content).not.toMatch(/\bfile_name\b/i);
          expect(content).not.toMatch(/\bfileContent\b/i);
        }
      });
    }

    scanDtoDir(srcDir);
  });
});
