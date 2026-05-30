import 'package:flutter/material.dart';
import 'colors.dart';
import 'typography.dart';
import 'spacing.dart';

/// Ember 앱 전체 ThemeData
class EmberTheme {
  EmberTheme._();

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    fontFamily: 'Pretendard',
    colorScheme: ColorScheme.fromSeed(
      seedColor: EmberColors.primary,
      primary: EmberColors.primary,
      onPrimary: Colors.white,
      surface: EmberColors.background,
      onSurface: EmberColors.textPrimary,
      error: EmberColors.error,
    ),
    scaffoldBackgroundColor: EmberColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: EmberColors.background,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: true,
      iconTheme: IconThemeData(color: Colors.black, size: 28),
      titleTextStyle: EmberTypography.appBarTitle,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: EmberColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(EmberSpacing.radiusMd),
        ),
        textStyle: EmberTypography.buttonLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: EmberColors.primary,
        side: const BorderSide(color: EmberColors.border),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(EmberSpacing.radiusMd),
        ),
        textStyle: EmberTypography.buttonMedium.copyWith(color: EmberColors.primary),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: EmberColors.primary,
        textStyle: EmberTypography.buttonMedium,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: EmberColors.backgroundPinkLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(EmberSpacing.radiusMd),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(EmberSpacing.radiusMd),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(EmberSpacing.radiusMd),
        borderSide: const BorderSide(color: EmberColors.primary, width: 1.5),
      ),
      hintStyle: EmberTypography.bodyMedium.copyWith(color: EmberColors.textTertiary),
    ),
    dividerTheme: const DividerThemeData(
      color: EmberColors.borderLight,
      thickness: 1,
      space: 0,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return EmberColors.primary;
        return null;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return EmberColors.primaryLight;
        return null;
      }),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: EmberColors.primary,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(EmberSpacing.radiusSm),
      ),
    ),
    dialogTheme: DialogThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(EmberSpacing.radiusXl),
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(EmberSpacing.radiusXl),
          topRight: Radius.circular(EmberSpacing.radiusXl),
        ),
      ),
    ),
  );
}
