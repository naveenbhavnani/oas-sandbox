declare module 'faker' {
  interface FakerStatic {
    seed(seed: number): void;
    
    name: {
      firstName(): string;
      lastName(): string;
      fullName(): string;
    };
    
    internet: {
      email(): string;
      userName(): string;
      url(): string;
      domainName(): string;
      ip(): string;
      ipv6(): string;
      password(): string;
    };
    
    address: {
      city(): string;
      country(): string;
      zipCode(): string;
      streetAddress(): string;
    };
    
    company: {
      name(): string;
    };
    
    commerce: {
      productName(): string;
      price(): string;
    };
    
    datatype: {
      number(options?: { min?: number; max?: number }): number;
      boolean(): boolean;
      uuid(): string;
      hexaDecimal(length?: number): string;
    };
    
    date: {
      recent(): Date;
      future(): Date;
    };
    
    lorem: {
      word(): string;
      words(count?: number): string;
      paragraph(): string;
    };
  }
  
  const faker: FakerStatic;
  export = faker;
}