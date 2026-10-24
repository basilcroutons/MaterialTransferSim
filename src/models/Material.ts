export interface Material {
    id: string;
    name: string;
    density: number; // kg/m3
    viscosity: number; // cP
    flowRate: number; // m3/h
}
