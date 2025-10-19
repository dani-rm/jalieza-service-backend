import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CiudadanosService } from './ciudadanos.service';
import { CreateCiudadanoDto } from './dto/create-ciudadano.dto';
import { UpdateCiudadanoDto } from './dto/update-ciudadano.dto';
import { SearchCiudadanoDto } from './dto/search-ciudadano.dto';
import { AuthGuard } from 'src/auth/guard/auth.guard';

@Controller('ciudadanos')
export class CiudadanosController {
  constructor(private readonly ciudadanosService: CiudadanosService) {}

  @Post()
  async create(@Body() createCiudadanoDto: CreateCiudadanoDto) {
    return this.ciudadanosService.createCiudadano(createCiudadanoDto);
  }

  @Get('marital-statuses')
  getMaritalStatuses() {
    return this.ciudadanosService.getMaritalStatuses();
  }

  @Post('search')
  searchCiudadanos(@Body() searchDto: SearchCiudadanoDto) {
    return this.ciudadanosService.searchCiudadanos(searchDto.query);
  }

  @Get()
  findAll() {
    return this.ciudadanosService.findAll(false);
  }

  /* @Get('deleted')
  findAllDeleted() {
    return this.ciudadanosService.findAll(true);
  } */

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ciudadanosService.findOne(+id);
  }

  // ✅ NUEVO: Promover ciudadano a siguiente orden
  @Patch(':id/promover-orden')
  // @UseGuards(AuthGuard)
  promoverOrden(@Param('id') id: string) {
    return this.ciudadanosService.promoverOrden(+id);
  }

  // ✅ NUEVO: Retroceder ciudadano a orden anterior
  @Patch(':id/retroceder-orden')
  // @UseGuards(AuthGuard)
  retrocederOrden(@Param('id') id: string) {
    return this.ciudadanosService.retrocederOrden(+id);
  }

  // ✅ MODIFICADO: Simplificar órdenes disponibles
  @Get(':id/ordenes-disponibles')
  getOrdenesDisponibles(@Param('id') id: string) {
    return this.ciudadanosService.getOrdenesDisponiblesSimple(+id);
  }

 /*  @Get(':id/ordenes-disponibles')
  getOrdenesDisponibles(@Param('id') id: string) {
    return this.ciudadanosService.getOrdenesDisponibles(+id);
  } */

 /*  @Get(':id/puntos')
  getPuntosCiudadano(@Param('id') id: string) {
    return this.ciudadanosService.getPuntosCiudadano(+id);
  } */

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCiudadanoDto: UpdateCiudadanoDto,
  ) {
    return this.ciudadanosService.update(+id, updateCiudadanoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ciudadanosService.remove(+id);
  }

  /* @Patch(':id/restaurar')
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.ciudadanosService.restaurarCiudadano(id);
  } */
}
