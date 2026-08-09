import { Injectable } from '@nestjs/common';
import { Prisma, type Doctor } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { DoctorCreateRequestDto } from './dto/doctor-create-request.dto';
import type { DoctorUpdateRequestDto } from './dto/doctor-update-request.dto';
import { normalizeBrazilianPhone } from './doctor-phone';
import { OwnershipBase } from '../common/ownership.base';
import type { DoctorResponse } from './doctor.types';

@Injectable()
export class DoctorService extends OwnershipBase {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createDoctor(input: DoctorCreateRequestDto, userId: number): Promise<DoctorResponse> {
    const doctor = await this.prisma.doctor.create({
      data: {
        userId,
        name: input.name,
        clinicName: input.clinic_name ?? null,
        phone: normalizeBrazilianPhone(input.phone),
        notes: input.notes ?? null,
      },
    });

    return this.toResponse(doctor, 0);
  }

  async getDoctorById(doctorId: number, userId: number): Promise<DoctorResponse | null> {
    const doctor = await this.prisma.doctor.findFirst({
      where: this.ownDoctor(doctorId, userId),
    });

    if (doctor === null) {
      return null;
    }

    const counts = await this.caseCountsByDoctorIds([doctor.id]);
    return this.toResponse(doctor, counts.get(doctor.id) ?? 0);
  }

  async getAllDoctors(skip: number, limit: number, userId: number): Promise<DoctorResponse[]> {
    const doctors = await this.prisma.doctor.findMany({
      skip,
      take: limit,
      where: this.ownDoctors(userId),
    });
    const counts = await this.caseCountsByDoctorIds(doctors.map((doctor) => doctor.id));

    return doctors.map((doctor) => this.toResponse(doctor, counts.get(doctor.id) ?? 0));
  }

  async updateDoctor(
    doctorId: number,
    input: DoctorUpdateRequestDto,
    userId: number,
  ): Promise<DoctorResponse | null> {
    const currentDoctor = await this.prisma.doctor.findFirst({
      where: this.ownDoctor(doctorId, userId),
    });

    if (currentDoctor === null) {
      return null;
    }

    const doctor = await this.prisma.doctor.update({
      where: { id: currentDoctor.id },
      data: this.buildUpdateData(input),
    });
    const counts = await this.caseCountsByDoctorIds([doctor.id]);

    return this.toResponse(doctor, counts.get(doctor.id) ?? 0);
  }

  async deleteDoctor(doctorId: number, userId: number): Promise<boolean> {
    const doctor = await this.prisma.doctor.findFirst({
      where: this.ownDoctor(doctorId, userId),
    });

    if (doctor === null) {
      return false;
    }

    const activeCase = await this.prisma.dentalCase.findFirst({
      where: {
        doctorId: doctor.id,
        deletedAt: null,
        status: {
          in: ['pending', 'completed'],
        },
      },
    });

    if (activeCase !== null) {
      throw new Error(
        'Não é possível excluir este doutor porque existem casos pendentes ou em andamento.',
      );
    }

    await this.prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return true;
  }

  private buildUpdateData(input: DoctorUpdateRequestDto): Prisma.DoctorUpdateInput {
    const data: Prisma.DoctorUpdateInput = {};

    if (input.name !== undefined) {
      if (input.name === null) {
        throw new Error('Doctor name cannot be null.');
      }

      data.name = input.name;
    }

    if (input.clinic_name !== undefined) {
      data.clinicName = input.clinic_name;
    }

    if (input.phone !== undefined) {
      data.phone = normalizeBrazilianPhone(input.phone);
    }

    if (input.notes !== undefined) {
      data.notes = input.notes;
    }

    return data;
  }

  private async caseCountsByDoctorIds(doctorIds: number[]): Promise<Map<number, number>> {
    if (doctorIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.dentalCase.groupBy({
      by: ['doctorId'],
      where: {
        doctorId: {
          in: doctorIds,
        },
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    return new Map(rows.map((row) => [row.doctorId, row._count.id]));
  }

  private toResponse(doctor: Doctor, casesCount: number): DoctorResponse {
    return {
      id: doctor.id,
      name: doctor.name,
      clinic_name: doctor.clinicName,
      phone: doctor.phone,
      notes: doctor.notes,
      created_at: doctor.createdAt,
      deleted_at: doctor.deletedAt,
      cases_count: casesCount,
    };
  }
}
