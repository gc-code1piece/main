import 'package:flutter/material.dart';
import 'colors.dart';

/// Ember 앱 타이포그래피 시스템
class EmberTypography {
  EmberTypography._();

  static const String _fontFamily = 'Pretendard';

  // ─── Heading ───
  static const TextStyle heading1 = TextStyle(
    fontSize: 30,
    fontWeight: FontWeight.w700,
    fontFamily: _fontFamily,
    color: EmberColors.primary,
  );

  static const TextStyle heading2 = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    fontFamily: _fontFamily,
    color: EmberColors.textOnPrimary,
  );

  static const TextStyle heading3 = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  static const TextStyle heading4 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  // ─── Title ───
  static const TextStyle titleLarge = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  // ─── Body ───
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  // ─── Caption ───
  static const TextStyle caption = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
    color: EmberColors.textSecondary,
  );

  static const TextStyle captionSmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w300,
    fontFamily: _fontFamily,
    color: EmberColors.textTertiary,
  );

  // ─── Button ───
  static const TextStyle buttonLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: Colors.white,
  );

  static const TextStyle buttonMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: Colors.white,
  );

  static const TextStyle buttonSmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: EmberColors.primary,
  );

  // ─── Tag/Chip ───
  static const TextStyle tag = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    fontFamily: _fontFamily,
    color: EmberColors.primary,
  );

  // ─── AppBar ───
  static const TextStyle appBarTitle = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: Colors.black,
  );

  // ─── Dialog ───
  static const TextStyle dialogTitle = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
  );

  static const TextStyle dialogBody = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    fontFamily: _fontFamily,
    color: EmberColors.textPrimary,
    height: 1.5,
  );
}
