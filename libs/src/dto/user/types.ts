import { Expose } from 'class-transformer';

export class UserInfo {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  role: string;
}
