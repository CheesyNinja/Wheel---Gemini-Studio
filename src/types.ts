export interface WheelOption {
  id: string;
  name: string;
  percentage: number;
  locked: boolean;
  color: string;
}

export interface SpinResult {
  option: WheelOption;
  angle: number;
}
