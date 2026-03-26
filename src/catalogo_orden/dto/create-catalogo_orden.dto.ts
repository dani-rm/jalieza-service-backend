import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCatalogoOrdenDto {
  @IsNotEmpty()
  @IsString()
  order_name: string;

/*   @IsNotEmpty()
  @IsNumber()
  required_points: number; */
}
