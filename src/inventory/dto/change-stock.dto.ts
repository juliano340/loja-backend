import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ChangeStockDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
