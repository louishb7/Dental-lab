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
import { CaseService } from './case.service';
import type { CaseResponse } from './case.types';
import { CaseBulkDeliverRequestDto } from './dto/case-bulk-deliver-request.dto';
import { CaseCreateRequestDto } from './dto/case-create-request.dto';
import { CaseListQueryDto } from './dto/case-list-query.dto';
import { CaseUpdateRequestDto } from './dto/case-update-request.dto';

const caseIdPipe = new ParseIntPipe({
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CaseController {
  constructor(private readonly cases: CaseService) {}

  @Post('/')
  async createCase(
    @Body() payload: CaseCreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseResponse> {
    try {
      return await this.cases.createCase(payload, user.id);
    } catch (error) {
      if (error instanceof Error) {
        throw new NotFoundException({ detail: error.message });
      }

      throw error;
    }
  }

  @Get('/')
  async readCases(
    @Query() query: CaseListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseResponse[]> {
    return this.cases.getAllCases(query, user.id);
  }

  @Get('/:case_id')
  async readCase(
    @Param('case_id', caseIdPipe) caseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseResponse> {
    const foundCase = await this.cases.getCaseById(caseId, user.id);
    if (foundCase === null) {
      throw new NotFoundException({ detail: 'Caso não encontrado' });
    }

    return foundCase;
  }

  @Post('/bulk-deliver')
  @HttpCode(200)
  async bulkDeliverCases(
    @Body() payload: CaseBulkDeliverRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseResponse[]> {
    try {
      return await this.cases.bulkDeliverCases(payload, user.id);
    } catch (error) {
      if (error instanceof Error) {
        throw new ConflictException({ detail: error.message });
      }

      throw error;
    }
  }

  @Put('/:case_id')
  async updateCase(
    @Param('case_id', caseIdPipe) caseId: number,
    @Body() payload: CaseUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseResponse> {
    try {
      const updatedCase = await this.cases.updateCase(caseId, payload, user.id);
      if (updatedCase === null) {
        throw new NotFoundException({ detail: 'Caso não encontrado' });
      }

      return updatedCase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new ConflictException({ detail: error.message });
      }

      throw error;
    }
  }

  @Delete('/:case_id')
  async deleteCase(
    @Param('case_id', caseIdPipe) caseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseResponse> {
    try {
      return await this.cases.deleteCase(caseId, user.id);
    } catch (error) {
      if (error instanceof Error && error.message === 'Caso não encontrado') {
        throw new NotFoundException({ detail: error.message });
      }

      if (error instanceof Error) {
        throw new ConflictException({ detail: error.message });
      }

      throw error;
    }
  }
}
