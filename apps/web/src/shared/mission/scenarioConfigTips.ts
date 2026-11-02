export const DURATION_TIPS: Record<number, string> = {
  7: '7 Days — Short surface sortie (CLPS / robotic scout)',
  14: '14 Days — Half lunar month (~1 full polar daylight window)',
  21: '21 Days — Extended surface mission window',
  28: '28 Days — Full lunar synodic month (29.5d day/night cycle)',
};

export const MAST_TIPS: Record<number, string> = {
  1: '1m: Rover mast (VIPER / robotic explorer)',
  2: '2m: Astronaut EVA suit / small lander deck',
  5: '5m: Medium cargo/crewed lander (Nova-C / Griffin)',
  10: '10m: Tall human lander (Artemis Starship HLS / solar tower)',
};

export const MAST_VEHICLE_SHORT: Record<number, string> = {
  1: '🤖 VIPER (1m)',
  2: '👨‍🚀 EVA (2m)',
  5: '📦 Cargo (5m)',
  10: '🚀 HLS (10m)',
};

export interface VehicleArchetype {
  label: string;
  vehicle: string;
  icon: string;
  gainDeg: number;
}

export const VEHICLE_ARCHETYPES: Record<number, VehicleArchetype> = {
  1: { label: 'Robotic Rover', vehicle: 'NASA VIPER / Scout', icon: '🤖', gainDeg: 0.03 },
  2: { label: 'Astronaut EVA', vehicle: 'Surface Suit / Tripod', icon: '👨‍🚀', gainDeg: 0.06 },
  5: { label: 'Cargo Lander', vehicle: 'CLPS Nova-C / Griffin', icon: '📦', gainDeg: 0.14 },
  10: { label: 'Human Lander', vehicle: 'Artemis Starship HLS', icon: '🚀', gainDeg: 0.29 },
};
