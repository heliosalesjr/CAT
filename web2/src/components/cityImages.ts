/**
 * Hero backdrop: one landscape photograph at a time, one per market.
 *
 * Full colour and no filter, because the brief asked the vibrance to
 * come out of the photographs themselves. Requested at 2400px wide so
 * they stay sharp on a wide display.
 *
 * Pexels, free to use. The credit line is shown under each frame.
 */
export type CityImage = {
  src: string;
  alt: string;
  city: string;
  country: string;
  photographer: string;
};

const wide = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=2400`;

export const CITY_IMAGES: readonly CityImage[] = [
  {
    src: wide("18495176"),
    alt: "Seoul after dark, office towers lit gold above a blue city",
    city: "Seoul",
    country: "South Korea",
    photographer: "Gije",
  },
  {
    src: wide("281514"),
    alt: "São Paulo at dusk, a lit park in front of the skyline",
    city: "São Paulo",
    country: "Brazil",
    photographer: "Hikaique",
  },
  {
    src: wide("15728900"),
    alt: "Bogotá under a bright sky, green hills behind the towers",
    city: "Bogotá",
    country: "Colombia",
    photographer: "Michael Pointner",
  },
  {
    src: wide("12768829"),
    alt: "Bangkok from above, a green park cut into the dense skyline",
    city: "Bangkok",
    country: "Thailand",
    photographer: "Kiran Deep Singh",
  },
  {
    src: wide("14170472"),
    alt: "The Angel of Independence in Mexico City, marigolds in the foreground",
    city: "Mexico City",
    country: "Mexico",
    photographer: "Oscar Dominguez",
  },
  {
    src: wide("26288655"),
    alt: "Lisbon rooftops in terracotta running down towards the water",
    city: "Lisbon",
    country: "Portugal",
    photographer: "Guilherme Marques",
  },
];
