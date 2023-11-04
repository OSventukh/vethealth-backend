import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Request,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthConfirmDto } from './dto/auth-confirm.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';

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
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Request() request): Promise<void> {
    return this.authService.logout({ sessionId: request.user.sessionId });
  }

  @ApiBearerAuth()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: AuthRegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiBearerAuth()
  @Get('confirm/:hash')
  @HttpCode(HttpStatus.OK)
  getPendingUser(@Param('hash') confirmationToken: string) {
    return this.authService.getPendingUser(confirmationToken);
  }

  @ApiBearerAuth()
  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmEmail(@Body() confirmDto: AuthConfirmDto) {
    return this.authService.confirm(confirmDto);
  }

  @ApiBearerAuth()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() forgotPasswordDto: AuthForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @ApiBearerAuth()
  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  currentUser(@Request() request) {
    return this.authService.getCurrentUser(request.user);
  }

  @ApiBearerAuth()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Request() request) {
    this.authService.refreshTokens({ sessionId: request.user.sessionId });
  }
}
