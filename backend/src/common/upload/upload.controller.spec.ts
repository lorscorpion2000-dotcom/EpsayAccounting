import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

describe('UploadController Permissions Guard', () => {
  let controller: UploadController;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [Reflector],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('باید متد upload دارای مجوز attachment.create باشد', () => {
    const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.upload);
    expect(permissions).toBeDefined();
    expect(permissions).toContain('attachment.create');
  });

  it('باید متد uploadMulti دارای مجوز attachment.create باشد', () => {
    const permissions = reflector.get<string[]>(PERMISSIONS_KEY, controller.uploadMulti);
    expect(permissions).toBeDefined();
    expect(permissions).toContain('attachment.create');
  });
});
