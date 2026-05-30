import 'package:flutter/material.dart';

/// Ember 앱 간격/크기 시스템
class EmberSpacing {
  EmberSpacing._();

  // ─── Base units ───
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;

  // ─── Screen padding ───
  static const EdgeInsets screenH = EdgeInsets.symmetric(horizontal: 24.0);
  static const EdgeInsets screenAll = EdgeInsets.all(24.0);
  static const EdgeInsets screenContent = EdgeInsets.fromLTRB(24, 16, 24, 24);

  // ─── Card padding ───
  static const EdgeInsets cardInner = EdgeInsets.all(16.0);
  static const EdgeInsets cardCompact = EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0);

  // ─── Border Radius ───
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusXxl = 24.0;
  static const double radiusSection = 30.0;
  static const double radiusPill = 100.0;

  // ─── Common BorderRadius ───
  static final BorderRadius borderRadiusSm = BorderRadius.circular(radiusSm);
  static final BorderRadius borderRadiusMd = BorderRadius.circular(radiusMd);
  static final BorderRadius borderRadiusLg = BorderRadius.circular(radiusLg);
  static final BorderRadius borderRadiusXl = BorderRadius.circular(radiusXl);
  static final BorderRadius borderRadiusPill = BorderRadius.circular(radiusPill);
  static const BorderRadius borderRadiusSection = BorderRadius.only(
    topLeft: Radius.circular(radiusSection),
    topRight: Radius.circular(radiusSection),
  );

  // ─── Component sizes ───
  static const double bottomNavHeight = 64.0;
  static const double buttonHeight = 50.0;
  static const double buttonHeightSmall = 40.0;
  static const double iconSizeSm = 20.0;
  static const double iconSizeMd = 24.0;
  static const double iconSizeLg = 28.0;
  static const double avatarSm = 36.0;
  static const double avatarMd = 44.0;
  static const double avatarLg = 70.0;
  static const double avatarXl = 80.0;
}
