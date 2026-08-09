import {
  Body,
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
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseItemCaseNotFoundError } from './case-item.errors';
import { CaseItemService } from './case-item.service';
import type { CaseItemResponse } from './case-item.types';
import { CaseItemCreateRequestDto } from './dto/case-item-create-request.dto';
import { CaseItemUpdateRequestDto } from './dto/case-item-update-request.dto';

const idPipe = new ParseIntPipe({
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

@Controller('cases/:case_id/items')
@UseGuards(JwtAuthGuard)
export class CaseItemController {
  constructor(private readonly caseItems: CaseItemService) {}

  @Get('/')
  async listItems(
    @Param('case_id', idPipe) caseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseItemResponse[]> {
    try {
      return await this.caseItems.listCaseItems(caseId, user.id);
    } catch (error) {
      this.throwNotFoundForMissingCase(error);
      throw error;
    }
  }

  @Post('/')
  async createItem(
    @Param('case_id', idPipe) caseId: number,
    @Body() payload: CaseItemCreateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseItemResponse> {
    try {
      return await this.caseItems.createCaseItem(caseId, payload, user.id);
    } catch (error) {
      this.throwNotFoundForMissingCase(error);
      throw error;
    }
  }

  @Post('/bulk')
  async createItemsBulk(
    @Param('case_id', idPipe) caseId: number,
    @Body() payload: { items: CaseItemCreateRequestDto[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseItemResponse[]> {
    try {
      return await this.caseItems.createCaseItemsBulk(caseId, payload.items, user.id);
    } catch (error) {
      this.throwNotFoundForMissingCase(error);
      throw error;
    }
  }

  @Get('/:item_id')
  async readItem(
    @Param('case_id', idPipe) caseId: number,
    @Param('item_id', idPipe) itemId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseItemResponse> {
    const item = await this.caseItems.getCaseItemById(caseId, itemId, user.id);
    if (item === null) {
      throw new NotFoundException({ detail: 'Item do caso não encontrado' });
    }

    return item;
  }

  @Put('/:item_id')
  async updateItem(
    @Param('case_id', idPipe) caseId: number,
    @Param('item_id', idPipe) itemId: number,
    @Body() payload: CaseItemUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseItemResponse> {
    try {
      const item = await this.caseItems.updateCaseItem(caseId, itemId, payload, user.id);
      if (item === null) {
        throw new NotFoundException({ detail: 'Item do caso não encontrado' });
      }

      return item;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.throwNotFoundForMissingCase(error);
      throw error;
    }
  }

  @Delete('/:item_id')
  @HttpCode(204)
  async deleteItem(
    @Param('case_id', idPipe) caseId: number,
    @Param('item_id', idPipe) itemId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const deleted = await this.caseItems.deleteCaseItem(caseId, itemId, user.id);
      if (!deleted) {
        throw new NotFoundException({ detail: 'Item do caso não encontrado' });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.throwNotFoundForMissingCase(error);
      throw error;
    }
  }

  private throwNotFoundForMissingCase(error: unknown): void {
    if (error instanceof CaseItemCaseNotFoundError) {
      throw new NotFoundException({ detail: error.message });
    }
  }
}
