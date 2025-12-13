import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from './shipping-address.dto';

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  items: {
    productId: number;
    quantity: number;
  }[];

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;
}
