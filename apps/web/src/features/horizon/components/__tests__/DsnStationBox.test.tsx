import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DsnStationBox } from '../DsnStationBox';

test('DsnStationBox: renders station name, flag, dish, and elevation correctly', () => {
  const station = {
    stationId: 'goldstone' as const,
    dishName: 'DSS-14 (70m Mars Dish)',
    azimuthDeg: 142.5,
    elevationDeg: 38.4,
    isVisible: true,
    horizonMaskDeg: 10.0,
  };

  const html = renderToStaticMarkup(
    React.createElement(DsnStationBox, {
      station,
      isActive: true,
      isLive: true,
    })
  );

  assert.ok(html.includes('GOLDSTONE'));
  assert.ok(html.includes('🇺🇸'));
  assert.ok(html.includes('DSS-14'));
  assert.ok(html.includes('+38.4°') || html.includes('38.4°'));
  assert.ok(html.includes('IN VIEW'));
});

test('DsnStationBox: renders inactive / below mask station with muted styling', () => {
  const station = {
    stationId: 'madrid' as const,
    dishName: 'DSS-63',
    azimuthDeg: 280.0,
    elevationDeg: -5.2,
    isVisible: false,
    horizonMaskDeg: 10.0,
  };

  const html = renderToStaticMarkup(
    React.createElement(DsnStationBox, {
      station,
      isActive: false,
      isLive: false,
    })
  );

  assert.ok(html.includes('MADRID'));
  assert.ok(html.includes('🇪🇸'));
  assert.ok(html.includes('BELOW MASK'));
  assert.ok(html.includes('-5.2°'));
});
