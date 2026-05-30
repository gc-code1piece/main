import 'package:flutter/material.dart';
import '../theme/colors.dart';
import '../theme/typography.dart';
import '../theme/spacing.dart';

/// Ember 빈 상태 / 로딩 / 에러 표시 위젯
class EmberEmptyState extends StatelessWidget {
  final bool isLoading;
  final String message;
  final bool canRetry;
  final VoidCallback? onRetry;
  final IconData? icon;

  const EmberEmptyState({
    super.key,
    this.isLoading = false,
    required this.message,
    this.canRetry = false,
    this.onRetry,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              const CircularProgressIndicator(color: EmberColors.primary)
            else ...[
              if (icon != null) ...[
                Icon(icon, size: 48, color: EmberColors.textTertiary),
                const SizedBox(height: 16),
              ],
              Text(
                message,
                textAlign: TextAlign.center,
                style: EmberTypography.bodyMedium.copyWith(
                  color: EmberColors.textSecondary,
                  height: 1.5,
                ),
              ),
              if (canRetry && onRetry != null) ...[
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('다시 시도'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: EmberColors.primary),
                    foregroundColor: EmberColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: EmberSpacing.borderRadiusMd,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
