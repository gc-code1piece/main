import 'package:flutter/material.dart';

/// Ember 앱 컬러 시스템
class EmberColors {
  EmberColors._();

  // ─── Primary ───
  static const Color primary = Color(0xFFE37474);
  static const Color primaryDark = Color(0xFFD45B5B);
  static const Color primaryLight = Color(0xFFF0B7B7);
  static const Color primaryBorder = Color(0xFFE95322);

  // ─── Text ───
  static const Color textPrimary = Color(0xFF391713);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textTertiary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF9A7A76);
  static const Color textOnPrimary = Color(0xFFF8F8F8);
  static const Color textDark = Color(0xFF111827);

  // ─── Background ───
  static const Color background = Colors.white;
  static const Color backgroundGray = Color(0xFFF5F5F5);
  static const Color backgroundWarm = Color(0xFFFFFAF6);
  static const Color backgroundPink = Color(0xFFFFF1F0);
  static const Color backgroundPeach = Color(0xFFFFEFE7);
  static const Color backgroundPinkLight = Color(0xFFFFF5F5);
  static const Color backgroundCard = Color(0xFFFFF4F1);

  // ─── Surface ───
  static const Color surface = Colors.white;
  static const Color surfaceGray = Color(0xFFE9E9E9);
  static const Color surfaceDisabled = Color(0xFFE5E5E5);

  // ─── Border ───
  static const Color border = Color(0xFFD1D5DB);
  static const Color borderLight = Color(0xFFE5E5E5);
  static const Color borderPink = Color(0xFFFFE0DB);
  static const Color borderPinkDark = Color(0xFFFFDFDB);
  static const Color borderCouple = Color(0xFFFFCDD2);

  // ─── Button ───
  static const Color buttonSecondary = Color(0xFFA1ACC3);
  static const Color buttonDisabled = Color(0xFFD1D5DB);
  static const Color buttonDisabledBg = Color(0xFFE5E7EB);

  // ─── Status ───
  static const Color error = Color(0xFFEF4444);
  static const Color success = Color(0xFF10B981);

  // ─── Gradient ───
  static const List<Color> coupleGradient = [
    Color(0xFFFFF1F0),
    Color(0xFFFFE8EC),
  ];

  // ─── Chat ───
  static const Color chatBubbleMe = primary;
  static const Color chatBubbleOther = Color(0xFFE9E9E9);
  static const Color chatInputBorder = Color(0xFFC7C7CC);
}
