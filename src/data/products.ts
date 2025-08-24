import laserMachine from '@/assets/laser-machine.jpg';
import laptop from '@/assets/laptop.jpg';
import industrialMachines from '@/assets/industrial-machines-hero.jpg';
import computersHero from '@/assets/computers-hero.jpg';

export interface Product {
  id: number;
  name: string;
  price?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  isNew?: boolean;
  isPromotion?: boolean;
  hasQuote?: boolean;
  rating: number;
  reviews: number;
  description: string;
  features: string[];
  specifications: Record<string, string>;
}

export const allProducts: Product[] = [
  // Produtos Industriais (do FeaturedProducts)
  {
    id: 1,
    name: "Máquina de Corte e Gravação a Laser CO2 80W",
    price: 450000,
    image: laserMachine,
    images: [
      laserMachine,
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Máquinas de Corte",
    isNew: true,
    hasQuote: true,
    rating: 4.8,
    reviews: 8,
    description: "Máquina de corte e gravação a laser CO2 de alta precisão, ideal para trabalhos profissionais em diversos materiais como madeira, acrílico, couro e tecidos. Equipamento robusto com sistema de refrigeração integrado.",
    features: [
      "Potência: 80W CO2",
      "Área de trabalho: 900x600mm",
      "Precisão: ±0.1mm",
      "Velocidade: até 50mm/s",
      "Sistema de refrigeração água",
      "Software compatível: LaserCAD, CorelDraw",
      "Garantia: 24 meses"
    ],
    specifications: {
      "Dimensões": "1400 x 1000 x 1200 mm",
      "Peso": "280 kg",
      "Voltagem": "220V monofásico",
      "Consumo": "1.5 kW/h",
      "Tipo de Laser": "CO2 selado",
      "Espessura máxima": "25mm (madeira), 20mm (acrílico)"
    }
  },
  {
    id: 2,
    name: "Máquina de Sorvete Comercial 3 Sabores",
    price: 180000,
    originalPrice: 220000,
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560717845-968823efbfa1?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Máquinas de Sorvete",
    isPromotion: true,
    hasQuote: true,
    rating: 4.5,
    reviews: 12,
    description: "Máquina de sorvete comercial profissional com capacidade para 3 sabores diferentes. Ideal para sorveterias, restaurantes e lanchonetes. Sistema de refrigeração eficiente e controle digital de temperatura.",
    features: [
      "Capacidade: 3 sabores simultâneos",
      "Produção: 25L/hora",
      "Sistema de mistura automática",
      "Controle digital de temperatura",
      "Material: Aço inoxidável 304",
      "Sistema de limpeza facilitada",
      "Garantia: 18 meses"
    ],
    specifications: {
      "Dimensões": "80 x 70 x 130 cm",
      "Peso": "120 kg",
      "Voltagem": "220V/380V",
      "Consumo": "2.8 kW/h",
      "Capacidade do Freezer": "12L por sabor",
      "Material": "Aço inoxidável 304"
    }
  },
  {
    id: 3,
    name: "Máquina de Costura Industrial Overloque",
    price: 85000,
    image: "https://picsum.photos/400/300?random=3",
    images: [
      "https://picsum.photos/600/400?random=3",
      "https://images.unsplash.com/photo-1558585219-3c7e8ba3f1f5?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Máquinas de Costura",
    hasQuote: true,
    rating: 4.3,
    reviews: 5,
    description: "Máquina de costura industrial overloque de alta velocidade, perfeita para acabamentos profissionais. Motor potente e sistema de lubrificação automática para uso intensivo.",
    features: [
      "Velocidade: 7000 ppm",
      "4 fios com facas",
      "Motor servo de 550W",
      "Sistema de lubrificação automática",
      "Mesa industrial incluída",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Dimensões": "68 x 36 x 68 cm",
      "Peso": "45 kg",
      "Voltagem": "220V monofásico",
      "Velocidade": "7000 pontos/min",
      "Tipo": "4 fios overloque",
      "Motor": "550W servo"
    }
  },
  {
    id: 4,
    name: "Equipamento de Perfuração de Água 150m",
    image: "https://picsum.photos/400/300?random=4",
    images: [
      "https://picsum.photos/600/400?random=4",
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Perfuração de Água",
    hasQuote: true,
    rating: 4.7,
    reviews: 3,
    description: "Equipamento completo para perfuração de poços artesianos até 150 metros de profundidade. Ideal para projetos residenciais, comerciais e industriais.",
    features: [
      "Profundidade: até 150m",
      "Motor diesel 78HP",
      "Sistema hidráulico robusto",
      "Broca de tungstênio incluída",
      "Compressor de ar integrado",
      "Garantia: 24 meses"
    ],
    specifications: {
      "Profundidade máxima": "150 metros",
      "Diâmetro do furo": "4-8 polegadas",
      "Motor": "78HP Diesel",
      "Peso": "2500 kg",
      "Dimensões": "6 x 2.5 x 3.2 m",
      "Combustível": "Diesel"
    }
  },
  // Produtos de Tecnologia (do FeaturedProducts)
  {
    id: 5,
    name: "Laptop ASUS VivoBook 15 - Intel i7, 16GB RAM, 512GB SSD",
    price: 89000,
    originalPrice: 95000,
    image: laptop,
    images: [
      laptop,
      computersHero,
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Laptops",
    isPromotion: true,
    rating: 4.6,
    reviews: 47,
    description: "Laptop ASUS VivoBook 15 com processador Intel Core i7 de última geração, 16GB de RAM e SSD de 512GB. Ideal para trabalho, estudos e entretenimento.",
    features: [
      "Processador Intel Core i7-12700H",
      "16GB RAM DDR4",
      "SSD NVMe 512GB",
      "Tela 15.6'' Full HD IPS",
      "Placa de vídeo integrada Intel Iris",
      "Bateria de longa duração",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Processador": "Intel Core i7-12700H",
      "Memória": "16GB DDR4",
      "Armazenamento": "SSD 512GB NVMe",
      "Tela": "15.6'' Full HD IPS",
      "Placa de Vídeo": "Intel Iris Xe",
      "Sistema": "Windows 11"
    }
  },
  {
    id: 6,
    name: "Desktop Gaming Intel i5 + GTX 1660 Super",
    price: 125000,
    image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&h=400&fit=crop&crop=center",
      computersHero,
      "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Desktops",
    isNew: true,
    rating: 4.8,
    reviews: 15,
    description: "Desktop gamer completo com processador Intel i5, placa de vídeo GTX 1660 Super e 16GB de RAM. Perfeito para jogos e aplicações profissionais.",
    features: [
      "Intel Core i5-12400F",
      "NVIDIA GTX 1660 Super 6GB",
      "16GB RAM DDR4 3200MHz",
      "SSD 480GB + HD 1TB",
      "Fonte 600W 80+ Bronze",
      "Gabinete gamer com RGB",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Processador": "Intel Core i5-12400F",
      "Placa de Vídeo": "NVIDIA GTX 1660 Super 6GB",
      "Memória": "16GB DDR4 3200MHz",
      "Armazenamento": "SSD 480GB + HD 1TB",
      "Fonte": "600W 80+ Bronze",
      "Sistema": "Windows 11"
    }
  },
  // Produtos do BestSellers que não estão acima
  {
    id: 7,
    name: "Monitor Samsung 24'' Full HD VA Gaming",
    price: 22000,
    image: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Monitores",
    rating: 4.4,
    reviews: 56,
    description: "Monitor Samsung 24 polegadas com painel VA, taxa de atualização de 144Hz e tempo de resposta de 1ms. Ideal para gaming e trabalho.",
    features: [
      "Tamanho: 24 polegadas",
      "Resolução: Full HD 1920x1080",
      "Taxa de atualização: 144Hz",
      "Tempo de resposta: 1ms",
      "Painel VA curvo",
      "FreeSync Premium",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Tamanho": "24 polegadas",
      "Resolução": "1920 x 1080 Full HD",
      "Taxa de atualização": "144Hz",
      "Tempo de resposta": "1ms MPRT",
      "Tipo de painel": "VA curvo",
      "Conectividade": "HDMI, DisplayPort"
    }
  },
  {
    id: 8,
    name: "Kit Gaming Teclado + Mouse RGB Mecânico",
    price: 8500,
    originalPrice: 12000,
    image: "https://picsum.photos/400/300?random=15",
    images: [
      "https://picsum.photos/600/400?random=15",
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Acessórios",
    isPromotion: true,
    rating: 4.5,
    reviews: 89,
    description: "Kit gamer completo com teclado mecânico RGB e mouse óptico de alta precisão. Switches Blue, iluminação personalizável e design ergonômico.",
    features: [
      "Teclado mecânico switches Blue",
      "Mouse óptico 6400 DPI",
      "Iluminação RGB personalizável",
      "Design anti-ghosting",
      "Cabo trançado resistente",
      "Software de personalização",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Tipo de switches": "Mecânico Blue",
      "DPI do mouse": "6400 DPI ajustável",
      "Iluminação": "RGB 16.7 milhões de cores",
      "Conectividade": "USB 2.0",
      "Compatibilidade": "Windows, macOS, Linux",
      "Cabo": "1.8m trançado"
    }
  }
];

export const getProductById = (id: number): Product | undefined => {
  return allProducts.find(product => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return allProducts.filter(product => product.category === category);
};

export const getFeaturedProducts = () => {
  return {
    industrial: allProducts.filter(p => ['Máquinas de Corte', 'Máquinas de Sorvete', 'Máquinas de Costura', 'Perfuração de Água'].includes(p.category)),
    tech: allProducts.filter(p => ['Laptops', 'Desktops'].includes(p.category))
  };
};

export const getBestSellers = (): Product[] => {
  return allProducts.filter(p => [1, 2, 3, 4, 5, 7, 8].includes(p.id));
};
