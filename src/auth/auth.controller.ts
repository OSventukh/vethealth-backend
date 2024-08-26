import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Request,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthConfirmDto } from './dto/auth-confirm.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthChangePasswordDto } from './dto/auth-change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBearerAuth()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() authDto: AuthLoginDto) {
    return this.authService.validateLogin(authDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Request() request): Promise<void> {
    return this.authService.logout({ sessionId: request.user.sessionId });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: AuthRegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiBearerAuth()
  @Get('confirm/:hash')
  @HttpCode(HttpStatus.OK)
  getPendingUser(@Param('hash') hash: string) {
    return this.authService.getPendingUser(hash);
  }

  @ApiBearerAuth()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirmEmail(@Body() confirmDto: AuthConfirmDto) {
    return this.authService.confirm(confirmDto);
  }

  @ApiBearerAuth()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: AuthForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Body() changePasswordDto: AuthChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  currentUser(@Request() request) {
    return this.authService.getCurrentUser(request.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Request() request) {
    return this.authService.refreshTokens({
      sessionId: request.user.sessionId,
    });
  }
}
