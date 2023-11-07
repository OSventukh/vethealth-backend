import { UserEntity } from '@/users/entities/user.entity';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RolesSerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const { user } = context.switchToHttp().getRequest();

    const group = user?.role?.id;
    if (!group) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data instanceof UserEntity && data.id === user.id) {
          return instanceToPlain(data, { groups: [group, 'me'] });
        }
        return instanceToPlain(data, { groups: [group] });
      }),
    );
  }
}
