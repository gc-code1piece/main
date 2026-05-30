import 'package:flutter/material.dart';
import '../theme/colors.dart';
import '../theme/typography.dart';
import '../theme/spacing.dart';

/// Ember 프라이머리 버튼 (채움)
class EmberPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool fullWidth;
  final IconData? icon;

  const EmberPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.fullWidth = true,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final button = ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: EmberColors.primary,
        disabledBackgroundColor: EmberColors.primaryLight,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        shape: RoundedRectangleBorder(
          borderRadius: EmberSpacing.borderRadiusMd,
        ),
      ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : icon != null
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 18),
                    const SizedBox(width: 8),
                    Text(label, style: EmberTypography.buttonLarge),
                  ],
                )
              : Text(label, style: EmberTypography.buttonLarge),
    );

    if (fullWidth) {
      return SizedBox(
        width: double.infinity,
        height: EmberSpacing.buttonHeight,
        child: button,
      );
    }
    return button;
  }
}

/// Ember 세컨더리 버튼 (회색 채움)
class EmberSecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool fullWidth;

  const EmberSecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.fullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    final button = ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: EmberColors.buttonSecondary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        shape: RoundedRectangleBorder(
          borderRadius: EmberSpacing.borderRadiusMd,
        ),
      ),
      child: Text(label, style: EmberTypography.buttonLarge),
    );

    if (fullWidth) {
      return SizedBox(
        width: double.infinity,
        height: EmberSpacing.buttonHeight,
        child: button,
      );
    }
    return button;
  }
}

/// Ember 아웃라인 버튼
class EmberOutlinedButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool fullWidth;
  final Color? borderColor;
  final Color? textColor;

  const EmberOutlinedButton({
    super.key,
    required this.label,
    this.onPressed,
    this.fullWidth = true,
    this.borderColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = textColor ?? EmberColors.primary;
    final button = OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: borderColor ?? EmberColors.border),
        shape: RoundedRectangleBorder(
          borderRadius: EmberSpacing.borderRadiusMd,
        ),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
      ),
      child: Text(
        label,
        style: EmberTypography.buttonMedium.copyWith(color: color),
      ),
    );

    if (fullWidth) {
      return SizedBox(width: double.infinity, height: 48, child: button);
    }
    return button;
  }
}

/// Ember 필(pill) 모양 FAB 스타일 버튼
class EmberPillButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;

  const EmberPillButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: icon != null ? Icon(icon, size: 18) : const SizedBox.shrink(),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: EmberColors.primary,
        elevation: 6,
        shadowColor: Colors.black26,
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
        shape: RoundedRectangleBorder(
          borderRadius: EmberSpacing.borderRadiusPill,
        ),
        textStyle: EmberTypography.buttonSmall.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

/// Ember 탭 버튼 (Friends 서브탭 등)
class EmberTabChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const EmberTabChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? EmberColors.primary : EmberColors.backgroundPeach,
          borderRadius: EmberSpacing.borderRadiusPill,
          border: isSelected
              ? Border.all(color: EmberColors.primaryBorder, width: 1.5)
              : null,
          boxShadow: isSelected
              ? [BoxShadow(color: EmberColors.primary.withValues(alpha: 0.2), blurRadius: 8, offset: const Offset(0, 2))]
              : null,
        ),
        child: Text(
          label,
          style: EmberTypography.buttonMedium.copyWith(
            color: isSelected ? Colors.white : EmberColors.primary,
          ),
        ),
      ),
    );
  }
}
