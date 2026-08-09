import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DoctorHasActiveCasesError, DoctorService } from './doctor.service';
import type { DoctorResponse } from './doctor.types';
import { DoctorCreateRequestDto } from './dto/doctor-create-request.dto';
import { DoctorListQueryDto } from './dto/doctor-list-query.dto';
import { DoctorUpdateRequestDto } from './dto/doctor-update-request.dto';

const doctorIdPipe = new ParseIntPipe({
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorController {
  constructor(private readonly doctors: DoctorService) {}

  @Post('/')
  async createDoctor(
    @Body() payload: DoctorCreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DoctorResponse> {
    return this.doctors.createDoctor(payload, user.id);
  }

  @Get('/')
  async readDoctors(
    @Query() query: DoctorListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DoctorResponse[]> {
    return this.doctors.getAllDoctors(query.skip, query.limit, user.id);
  }

  @Get('/:doctor_id')
  async readDoctor(
    @Param('doctor_id', doctorIdPipe) doctorId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.getDoctorById(doctorId, user.id);
    if (doctor === null) {
      throw new NotFoundException({
        detail: 'Doutor não encontrado',
      });
    }

    return doctor;
  }

  @Put('/:doctor_id')
  async updateDoctor(
    @Param('doctor_id', doctorIdPipe) doctorId: number,
    @Body() payload: DoctorUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DoctorResponse> {
    const doctor = await this.doctors.updateDoctor(doctorId, payload, user.id);
    if (doctor === null) {
      throw new NotFoundException({
        detail: 'Doutor não encontrado',
      });
    }

    return doctor;
  }

  @Delete('/:doctor_id')
  @HttpCode(204)
  async deleteDoctor(
    @Param('doctor_id', doctorIdPipe) doctorId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const deleted = await this.doctors.deleteDoctor(doctorId, user.id);
      if (!deleted) {
        throw new NotFoundException({
          detail: 'Doutor não encontrado',
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof DoctorHasActiveCasesError) {
        throw new ConflictException({
          detail: error.message,
        });
      }

      throw error;
    }
  }
}
