import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseHistoryService } from './case-history.service';
import type {
  CaseHistoryDetailResponse,
  CaseHistoryEventsResponse,
  CaseHistoryListResponse,
} from './case-history.types';
import { CaseHistoryEventsQueryDto } from './dto/case-history-events-query.dto';
import { CaseHistoryListQueryDto } from './dto/case-history-list-query.dto';

const caseIdPipe = new ParseIntPipe({
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

@Controller()
@UseGuards(JwtAuthGuard)
export class CaseHistoryController {
  constructor(private readonly history: CaseHistoryService) {}

  @Get('/case-history')
  async listCaseHistory(
    @Query() query: CaseHistoryListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseHistoryListResponse> {
    return this.history.listCases(query, user.id);
  }

  @Get('/case-history/:case_id')
  async getCaseHistoryDetail(
    @Param('case_id', caseIdPipe) caseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseHistoryDetailResponse> {
    const foundCase = await this.history.getCaseDetail(caseId, user.id);
    if (foundCase === null) {
      throw new NotFoundException({ detail: 'Caso não encontrado' });
    }

    return foundCase;
  }

  @Get('/cases/:case_id/history')
  async listCaseEvents(
    @Param('case_id', caseIdPipe) caseId: number,
    @Query() query: CaseHistoryEventsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseHistoryEventsResponse> {
    const events = await this.history.listCaseEvents(caseId, query, user.id);
    if (events === null) {
      throw new NotFoundException({ detail: 'Caso não encontrado' });
    }

    return events;
  }
}
