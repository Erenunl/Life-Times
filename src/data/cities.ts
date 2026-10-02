import type { City } from "../types/game";

export const cities: City[] = [
  { id: "city-newford", name: "Newford", country: "Bellmare" },
  { id: "city-bellmont", name: "Bellmont", country: "Bellmare" },
  { id: "city-westhaven", name: "Westhaven", country: "Bellmare" },
];

export function findCityById(cityId: string): City | undefined {
  return cities.find((city) => city.id === cityId);
}
