export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}
