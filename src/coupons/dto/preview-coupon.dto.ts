import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class PreviewCouponDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 32)
  couponCode: string;

  // Ex: "123.45"
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'subtotal deve ser uma string numérica (ex: "123.45")',
  })
  subtotal: string;
}
