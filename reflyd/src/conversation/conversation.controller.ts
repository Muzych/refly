import {
  Controller,
  Logger,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  Body,
  Res,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ChatParam,
  CreateConversationParam,
  CreateConversationResponse,
  ListConversationResponse,
  RetrieveParam,
} from './dto';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { LlmService } from '../llm/llm.service';
import { createLCChatMessage } from '../llm/schema';

@Controller('conversation')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(
    private conversationService: ConversationService,
    private llmService: LlmService,
  ) {}

  @Post('new')
  @ApiResponse({ type: CreateConversationResponse })
  async createConversation(
    @Request() req,
    @Body() body: CreateConversationParam,
  ) {
    // TODO: replace this with actual user
    const res = await this.conversationService.create(
      body,
      '5c0a7922c9d89830f4911426',
    );

    return {
      data: res,
    };
  }

  @Post('retrieve')
  async retrieveDocs(@Body() body: RetrieveParam) {
    return this.llmService.retrieveRelevantDocs(body.input.query);
  }

  @Get(':conversationId/chat')
  async chat(
    @Query('query') query = '',
    @Param('conversationId') conversationId = '',
    @Res() res: Response,
  ) {
    if (!conversationId) {
      throw new BadRequestException('conversation id cannot be empty');
    }

    if (!query) {
      throw new BadRequestException('query cannot be empty');
    }

    // TODO: replace this with actual user
    const userId = '5c0a7922c9d89830f4911426';

    await this.conversationService.addChatMessage({
      type: 'human',
      userId,
      conversationId: conversationId,
      content: query,
      sources: '',
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(200);

    // 获取聊天历史
    const chatHistory = await this.conversationService.getMessages(
      conversationId,
    );

    const { stream, sources } = await this.llmService.chat(
      query,
      chatHistory
        ? chatHistory.map((msg) => createLCChatMessage(msg.content, msg.type))
        : [],
    );

    // first return sources，use unique tag for parse data
    // res.write(`data: [REFLY_SOURCES]${JSON.stringify(sources)}\n\n`);

    // write answer in a stream style
    let answerStr = '';
    for await (const chunk of await stream) {
      answerStr += chunk;
      res.write(`data: ${chunk}\n\n`);
    }

    res.end(`data: [DONE]\n\n`);

    await this.conversationService.addChatMessage({
      type: 'ai',
      userId,
      conversationId,
      content: answerStr,
      sources: JSON.stringify(sources),
    });
  }

  @Get('list')
  @ApiResponse({ type: ListConversationResponse })
  async listConversation(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    const parsedPage = parseInt(page);
    const parsedPageSize = parseInt(pageSize);

    const conversationList = await this.conversationService.getConversations({
      skip: (parsedPage - 1) * parsedPageSize,
      take: parsedPageSize,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: conversationList,
    };
  }

  @Get(':conversationId')
  @ApiParam({ name: 'conversationId' })
  @ApiResponse({ type: ListConversationResponse })
  async showConversationDetail(
    @Param('conversationId') conversationId: string,
  ) {
    const conversation = await this.conversationService.findFirstConversation({
      where: { conversationId },
    });
    const messages = await this.conversationService.getMessages(conversationId);

    return {
      data: {
        ...conversation,
        messages: messages,
      },
    };
  }
}
