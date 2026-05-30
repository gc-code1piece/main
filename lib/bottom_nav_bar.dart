import 'package:flutter/material.dart';
import 'theme/colors.dart';
import 'theme/spacing.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: EmberColors.primary,
        boxShadow: [
          BoxShadow(
            color: EmberColors.primary.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: EmberSpacing.bottomNavHeight,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: Icons.auto_stories_outlined,
                activeIcon: Icons.auto_stories,
                isActive: currentIndex == 0,
                onTap: () => onTap(0),
                label: '일기',
              ),
              _NavItem(
                icon: Icons.favorite_border,
                activeIcon: Icons.favorite,
                isActive: currentIndex == 1,
                onTap: () => onTap(1),
                label: '소통',
              ),
              _NavItem(
                icon: Icons.person_outline,
                activeIcon: Icons.person,
                isActive: currentIndex == 2,
                onTap: () => onTap(2),
                label: '더보기',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final bool isActive;
  final VoidCallback onTap;
  final String label;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.isActive,
    required this.onTap,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              color: isActive ? Colors.white : Colors.white70,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? Colors.white : Colors.white70,
                fontSize: 11,
                fontFamily: 'Pretendard',
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
