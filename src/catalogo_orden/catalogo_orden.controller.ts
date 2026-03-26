import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CatalogoOrdenService } from './catalogo_orden.service';
import { CreateCatalogoOrdenDto } from './dto/create-catalogo_orden.dto';
import { UpdateCatalogoOrdenDto } from './dto/update-catalogo_orden.dto';

@Controller('catalogo-orden')
export class CatalogoOrdenController {
  constructor(private readonly catalogoOrdenService: CatalogoOrdenService) {}

  /* @Post()
  create(@Body() createCatalogoOrdenDto: CreateCatalogoOrdenDto) {
    return this.catalogoOrdenService.create(createCatalogoOrdenDto);
  } */

  @Get()
  findAll() {
    return this.catalogoOrdenService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogoOrdenService.findOne(+id);
  }

 /*  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCatalogoOrdenDto: UpdateCatalogoOrdenDto) {
    return this.catalogoOrdenService.update(+id, updateCatalogoOrdenDto);
  } */

 /*  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogoOrdenService.remove(+id);
  } */
}
