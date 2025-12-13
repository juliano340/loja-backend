import { IsOptional, IsString, Length } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @Length(3, 100)
  street: string;

  @IsString()
  @Length(1, 20)
  number: string;

  @IsString()
  @Length(2, 50)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @IsString()
  @Length(5, 10)
  zip: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  complement?: string;
}
