import { IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @NotEquals(0)
  delta: number; // pode ser + ou -

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
