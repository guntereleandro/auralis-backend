import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da família é obrigatório' })
  name: string;
}