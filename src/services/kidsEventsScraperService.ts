import {
  KidsEvent,
  EventCategory,
  CostBracket,
  EventSource,
  AgeRange,
  EventFilters,
  SE20_COORDS,
  DISTANCE_THRESHOLDS,
} from '@/types/kidsEvents.types';

interface ScrapedEventData {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  venue?: string;
  address?: string;
  postcode?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  price?: string;
  isFree?: boolean;
  categories?: string[];
  ageInfo?: string;
  rating?: number;
  reviewCount?: number;
}

class KidsEventsScraperService {
  private static readonly USER_KIDS_AGES = [2.5, 5.5];

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Determine cost bracket from price
   */
  private determineCostBracket(price?: number, isFree?: boolean): CostBracket {
    if (isFree || price === 0) return 'free';
    if (!price) return 'low';
    if (price < 10) return 'low';
    if (price < 25) return 'medium';
    return 'high';
  }

  /**
   * Parse price string to number
   */
  private parsePrice(priceStr?: string): { price?: number; isFree: boolean } {
    if (!priceStr) return { isFree: false };

    const lower = priceStr.toLowerCase();
    if (lower.includes('free') || lower === '£0' || lower === '0') {
      return { price: 0, isFree: true };
    }

    const match = priceStr.match(/£?([\d.]+)/);
    if (match) {
      return { price: parseFloat(match[1]), isFree: false };
    }

    return { isFree: false };
  }

  /**
   * Determine age suitability
   */
  private determineAgeSuitability(ageInfo?: string, categories?: string[]): {
    ageRange: AgeRange;
    minAge?: number;
    maxAge?: number;
    suitableForToddlers: boolean;
    suitableForPreschool: boolean;
  } {
    let minAge: number | undefined;
    let maxAge: number | undefined;

    if (ageInfo) {
      const ageMatch = ageInfo.match(/(\d+)\s*[-–to]+\s*(\d+)/i);
      if (ageMatch) {
        minAge = parseInt(ageMatch[1]);
        maxAge = parseInt(ageMatch[2]);
      } else {
        const underMatch = ageInfo.match(/under\s*(\d+)/i);
        if (underMatch) {
          minAge = 0;
          maxAge = parseInt(underMatch[1]);
        }
        const plusMatch = ageInfo.match(/(\d+)\s*\+/i);
        if (plusMatch) {
          minAge = parseInt(plusMatch[1]);
        }
      }
    }

    // Check if suitable for our kids (2.5 and 5.5)
    const suitableForToddlers = !minAge || minAge <= 2.5;
    const suitableForPreschool = (!minAge || minAge <= 5.5) && (!maxAge || maxAge >= 5.5);

    // Determine age range category
    let ageRange: AgeRange = 'all-ages';
    if (maxAge && maxAge <= 3) ageRange = 'toddler';
    else if (minAge && minAge >= 5) ageRange = 'early-years';
    else if (!minAge || minAge <= 3) ageRange = 'preschool';

    return { ageRange, minAge, maxAge, suitableForToddlers, suitableForPreschool };
  }

  /**
   * Infer categories from text
   */
  private inferCategories(title: string, description: string, categories?: string[]): EventCategory[] {
    const text = `${title} ${description} ${(categories || []).join(' ')}`.toLowerCase();
    const inferred: EventCategory[] = [];

    if (text.includes('free') || text.includes('no charge')) inferred.push('free');
    if (text.includes('museum') || text.includes('exhibition') || text.includes('gallery')) inferred.push('museum');
    if (text.includes('theatre') || text.includes('show') || text.includes('pantomime') || text.includes('puppet')) inferred.push('theatre');
    if (text.includes('sport') || text.includes('football') || text.includes('tennis') || text.includes('gym') || text.includes('active')) inferred.push('sports');
    if (text.includes('art') || text.includes('craft') || text.includes('paint') || text.includes('draw') || text.includes('creative')) inferred.push('arts');
    if (text.includes('swim') || text.includes('pool') || text.includes('splash') || text.includes('water')) inferred.push('swimming');
    if (text.includes('nature') || text.includes('wildlife') || text.includes('animal') || text.includes('farm') || text.includes('zoo')) inferred.push('nature');
    if (text.includes('science') || text.includes('experiment') || text.includes('stem') || text.includes('discovery')) inferred.push('science');
    if (text.includes('music') || text.includes('dance') || text.includes('sing') || text.includes('concert')) inferred.push('music');
    if (text.includes('festival') || text.includes('fair') || text.includes('carnival')) inferred.push('festival');
    if (text.includes('workshop') || text.includes('class') || text.includes('session')) inferred.push('workshop');
    if (text.includes('outdoor') || text.includes('park') || text.includes('garden') || text.includes('forest') || text.includes('adventure')) inferred.push('outdoor');
    if (text.includes('indoor') || text.includes('soft play') || text.includes('play centre')) inferred.push('indoor');

    return inferred.length > 0 ? inferred : ['other'];
  }

  /**
   * Extract features from description
   */
  private extractFeatures(description: string): string[] {
    const features: string[] = [];
    const text = description.toLowerCase();

    if (text.includes('buggy') || text.includes('pushchair') || text.includes('pram')) features.push('Buggy friendly');
    if (text.includes('cafe') || text.includes('restaurant') || text.includes('food')) features.push('Cafe on-site');
    if (text.includes('parking') || text.includes('car park')) features.push('Parking available');
    if (text.includes('toilet') || text.includes('changing')) features.push('Baby changing');
    if (text.includes('wheelchair') || text.includes('accessible')) features.push('Wheelchair accessible');
    if (text.includes('picnic')) features.push('Picnic area');
    if (text.includes('indoor') && text.includes('outdoor')) features.push('Indoor & outdoor');
    if (text.includes('bookable') || text.includes('book in advance')) features.push('Booking required');

    return features;
  }

  /**
   * Generate a unique ID for an event
   */
  private generateEventId(source: EventSource, sourceId?: string, title?: string): string {
    const base = sourceId || title?.substring(0, 20).replace(/\s+/g, '-').toLowerCase() || Date.now().toString();
    return `${source}-${base}-${Date.now().toString(36)}`;
  }

  /**
   * Normalize scraped data into KidsEvent format
   */
  private normalizeEvent(data: ScrapedEventData, source: EventSource, coords?: { lat: number; lon: number }): KidsEvent {
    const { price, isFree } = this.parsePrice(data.price);
    const ageSuitability = this.determineAgeSuitability(data.ageInfo, data.categories);
    const categories = this.inferCategories(data.title, data.description, data.categories);
    const features = this.extractFeatures(data.description);

    let distanceFromSE20: number | undefined;
    let isLocal = false;

    if (coords) {
      distanceFromSE20 = this.calculateDistance(
        SE20_COORDS.latitude,
        SE20_COORDS.longitude,
        coords.lat,
        coords.lon
      );
      isLocal = distanceFromSE20 <= DISTANCE_THRESHOLDS.LOCAL;
    } else if (data.postcode) {
      // Estimate based on postcode prefix
      const prefix = data.postcode.toUpperCase().substring(0, 4);
      if (prefix.startsWith('SE20') || prefix.startsWith('SE19') || prefix.startsWith('SE26') || prefix.startsWith('SE25')) {
        isLocal = true;
        distanceFromSE20 = 2;
      } else if (prefix.startsWith('SE') || prefix.startsWith('BR')) {
        distanceFromSE20 = 5;
      } else {
        distanceFromSE20 = 10;
      }
    }

    const now = new Date().toISOString();

    return {
      id: this.generateEventId(source, undefined, data.title),
      title: data.title,
      description: data.description,
      shortDescription: data.description.substring(0, 150) + (data.description.length > 150 ? '...' : ''),
      category: categories[0],
      categories,
      ...ageSuitability,
      location: {
        name: data.venue || 'Venue TBC',
        address: data.address || '',
        postcode: data.postcode || '',
        distanceFromSE20,
      },
      isLocal,
      timing: {
        date: data.date || new Date().toISOString().split('T')[0],
        startTime: data.startTime,
        endTime: data.endTime,
      },
      pricing: {
        isFree: isFree || false,
        childPrice: price,
        bookingUrl: data.url,
      },
      costBracket: this.determineCostBracket(price, isFree),
      imageUrl: data.imageUrl,
      thumbnailUrl: data.imageUrl,
      reviews: data.rating ? [{
        source,
        rating: data.rating,
        reviewCount: data.reviewCount,
      }] : undefined,
      averageRating: data.rating,
      source,
      sourceUrl: data.url,
      features,
      scrapedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Fetch events from Eventbrite API
   */
  async fetchEventbriteEvents(): Promise<KidsEvent[]> {
    try {
      const response = await fetch('/api/events/scrape?source=eventbrite');
      if (!response.ok) throw new Error('Failed to fetch Eventbrite events');
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Eventbrite scrape failed:', error);
      return [];
    }
  }

  /**
   * Fetch events from TimeOut London
   */
  async fetchTimeoutEvents(): Promise<KidsEvent[]> {
    try {
      const response = await fetch('/api/events/scrape?source=timeout');
      if (!response.ok) throw new Error('Failed to fetch TimeOut events');
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('TimeOut scrape failed:', error);
      return [];
    }
  }

  /**
   * Fetch events from Visit London
   */
  async fetchVisitLondonEvents(): Promise<KidsEvent[]> {
    try {
      const response = await fetch('/api/events/scrape?source=visitlondon');
      if (!response.ok) throw new Error('Failed to fetch Visit London events');
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Visit London scrape failed:', error);
      return [];
    }
  }

  /**
   * Get curated summer events (fallback/supplement data)
   */
  getCuratedSummerEvents(): KidsEvent[] {
    const now = new Date().toISOString();
    const summer2026Start = '2026-06-01';
    const summer2026End = '2026-09-01';

    // Curated list of reliable summer events
    const curatedEvents: Partial<KidsEvent>[] = [
      {
        title: 'Natural History Museum - Free Entry',
        description: 'Explore dinosaurs, wildlife, and the wonders of the natural world. The museum offers free entry and is perfect for curious kids of all ages. See the famous Dippy the Dinosaur, explore the wildlife garden, and discover interactive exhibits.',
        shortDescription: 'World-famous museum with dinosaurs, wildlife exhibits and interactive displays. Free entry!',
        category: 'museum',
        categories: ['museum', 'science', 'free'],
        location: { name: 'Natural History Museum', address: 'Cromwell Road', postcode: 'SW7 5BD', distanceFromSE20: 8 },
        isLocal: false,
        timing: { date: '2026-07-01', isRecurring: true, recurringPattern: 'Daily during summer' },
        pricing: { isFree: true },
        costBracket: 'free',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Baby changing', 'Wheelchair accessible'],
        highlights: ['See the Blue Whale skeleton', 'Wildlife Garden', 'Dinosaur Gallery'],
        source: 'manual',
        sourceUrl: 'https://www.nhm.ac.uk',
      },
      {
        title: 'Crystal Palace Park - Dinosaurs & Maze',
        description: 'Visit the famous Victorian dinosaur sculptures and explore the maze in beautiful Crystal Palace Park. Perfect for a family day out with playgrounds, a boating lake, and plenty of green space for picnics.',
        shortDescription: 'Historic dinosaur sculptures, maze, playgrounds and boating lake right on your doorstep.',
        category: 'outdoor',
        categories: ['outdoor', 'nature', 'free'],
        location: { name: 'Crystal Palace Park', address: 'Thicket Road', postcode: 'SE20 8DT', distanceFromSE20: 0.5 },
        isLocal: true,
        timing: { date: '2026-07-01', isAllDay: true, isRecurring: true, recurringPattern: 'Daily' },
        pricing: { isFree: true },
        costBracket: 'free',
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Parking available', 'Picnic area'],
        highlights: ['Victorian Dinosaurs', 'Maze', 'Playgrounds', 'Boating Lake'],
        source: 'manual',
        sourceUrl: 'https://www.crystalpalacepark.org.uk',
      },
      {
        title: 'Science Museum - Wonderlab',
        description: 'Interactive science gallery with over 50 exhibits to explore. Perfect for curious minds! The Wonderlab features hands-on experiments, live demonstrations, and immersive experiences.',
        shortDescription: 'Interactive science exhibits, live shows and hands-on experiments for kids.',
        category: 'science',
        categories: ['science', 'museum', 'indoor'],
        location: { name: 'Science Museum', address: 'Exhibition Road', postcode: 'SW7 2DD', distanceFromSE20: 8 },
        isLocal: false,
        timing: { date: '2026-07-15', startTime: '10:00', endTime: '18:00' },
        pricing: { isFree: false, childPrice: 10, adultPrice: 15, familyPrice: 40, priceNotes: 'Under 3s free' },
        costBracket: 'medium',
        imageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Baby changing'],
        highlights: ['Live science shows', '50+ interactive exhibits', 'Flight simulator'],
        source: 'manual',
        sourceUrl: 'https://www.sciencemuseum.org.uk/see-and-do/wonderlab-equinor-gallery',
      },
      {
        title: 'London Zoo Summer Safari',
        description: 'Meet over 750 species of animals at ZSL London Zoo. Summer activities include animal talks, feeding times, and the splash zone. Book tickets in advance for the best prices.',
        shortDescription: 'See lions, penguins, gorillas and more! Special summer activities and splash zone.',
        category: 'nature',
        categories: ['nature', 'outdoor'],
        location: { name: 'ZSL London Zoo', address: 'Outer Circle, Regents Park', postcode: 'NW1 4RY', distanceFromSE20: 10 },
        isLocal: false,
        timing: { date: '2026-08-01', startTime: '10:00', endTime: '17:00', isRecurring: true, recurringPattern: 'Daily in summer' },
        pricing: { isFree: false, childPrice: 22, adultPrice: 30, familyPrice: 90, priceNotes: 'Under 3s free. Book online for 10% off' },
        costBracket: 'high',
        imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Parking available', 'Baby changing'],
        highlights: ['Land of the Lions', 'Penguin Beach', 'Gorilla Kingdom', 'Summer Splash Zone'],
        source: 'manual',
        sourceUrl: 'https://www.zsl.org/zsl-london-zoo',
        averageRating: 4.5,
      },
      {
        title: 'Horniman Museum - Free Entry',
        description: 'Discover world cultures, natural history and musical instruments in this beautiful museum with stunning gardens. The aquarium, butterfly house and nature trail are perfect for little explorers.',
        shortDescription: 'Free museum with aquarium, butterfly house, gardens and world cultures exhibits.',
        category: 'museum',
        categories: ['museum', 'nature', 'free'],
        location: { name: 'Horniman Museum', address: '100 London Road, Forest Hill', postcode: 'SE23 3PQ', distanceFromSE20: 2 },
        isLocal: true,
        timing: { date: '2026-07-01', startTime: '10:00', endTime: '17:30', isRecurring: true, recurringPattern: 'Daily' },
        pricing: { isFree: true, priceNotes: 'Aquarium £3.50, Butterfly House £5' },
        costBracket: 'free',
        imageUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Picnic area', 'Baby changing'],
        highlights: ['Aquarium', 'Butterfly House', 'Music Gallery', 'Nature Trail'],
        source: 'manual',
        sourceUrl: 'https://www.horniman.ac.uk',
        averageRating: 4.7,
      },
      {
        title: 'Dulwich Park - Boating & Playground',
        description: 'Beautiful Victorian park with boating lake, excellent playground, and cafe. Rent a pedalo or rowboat and explore the lake, then let the kids loose on the adventure playground.',
        shortDescription: 'Boating lake, adventure playground, and cafe in a beautiful park setting.',
        category: 'outdoor',
        categories: ['outdoor', 'free'],
        location: { name: 'Dulwich Park', address: 'College Road', postcode: 'SE21 7BQ', distanceFromSE20: 3 },
        isLocal: true,
        timing: { date: '2026-07-01', isAllDay: true, isRecurring: true, recurringPattern: 'Daily' },
        pricing: { isFree: true, priceNotes: 'Boat hire £12-15/hour' },
        costBracket: 'free',
        imageUrl: 'https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Parking available', 'Picnic area'],
        highlights: ['Boating Lake', 'Adventure Playground', 'Victorian Gardens'],
        source: 'manual',
        sourceUrl: 'https://www.southwark.gov.uk/parks-and-open-spaces/parks/dulwich-park',
        averageRating: 4.6,
      },
      {
        title: 'Beckenham Place Park - Wild Swimming & Nature',
        description: 'Newly restored parkland with Londons first public wild swimming lake, adventure playground, and woodland trails. A hidden gem for nature-loving families.',
        shortDescription: 'Wild swimming lake, adventure playground and woodland trails in restored parkland.',
        category: 'outdoor',
        categories: ['outdoor', 'swimming', 'nature'],
        location: { name: 'Beckenham Place Park', address: 'Beckenham Hill Road', postcode: 'BR3 1SY', distanceFromSE20: 3 },
        isLocal: true,
        timing: { date: '2026-07-01', startTime: '08:00', endTime: '20:00', isRecurring: true, recurringPattern: 'Daily in summer' },
        pricing: { isFree: false, childPrice: 4, adultPrice: 8, priceNotes: 'Swimming session booking required. Park entry free.' },
        costBracket: 'low',
        imageUrl: 'https://images.unsplash.com/photo-1500463959177-e0869687df26?w=800',
        suitableForToddlers: false,
        suitableForPreschool: true,
        minAge: 4,
        features: ['Cafe on-site', 'Parking available', 'Picnic area'],
        highlights: ['Wild Swimming Lake', 'Nature Trails', 'Adventure Playground', 'Mansion Cafe'],
        source: 'manual',
        sourceUrl: 'https://www.lewisham.gov.uk/inmyarea/openspaces/parks/beckenham-place-park',
        averageRating: 4.4,
      },
      {
        title: 'Little Angel Theatre - Summer Shows',
        description: 'Londons only permanent puppet theatre with shows specially designed for young children. Magical performances that captivate toddlers and older kids alike.',
        shortDescription: 'Magical puppet theatre with shows for ages 2+. Intimate venue, enchanting performances.',
        category: 'theatre',
        categories: ['theatre', 'arts', 'indoor'],
        location: { name: 'Little Angel Theatre', address: '14 Dagmar Passage, Islington', postcode: 'N1 2DN', distanceFromSE20: 9 },
        isLocal: false,
        timing: { date: '2026-07-20', startTime: '11:00', endTime: '12:00' },
        pricing: { isFree: false, childPrice: 14, adultPrice: 14, familyPrice: 50 },
        costBracket: 'medium',
        imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        minAge: 2,
        features: ['Baby changing', 'Booking required'],
        highlights: ['Shows for ages 2+', 'Intimate 100-seat theatre', 'Post-show meet puppets'],
        source: 'manual',
        sourceUrl: 'https://littleangeltheatre.com',
        averageRating: 4.8,
      },
      {
        title: 'Kew Gardens - Summer Family Activities',
        description: 'Explore 300 acres of beautiful gardens with summer trails, the treetop walkway, and play areas. Special summer events include the Childrens Garden and science activities.',
        shortDescription: 'Beautiful gardens with treetop walkway, Childrens Garden and summer trails.',
        category: 'nature',
        categories: ['nature', 'outdoor', 'science'],
        location: { name: 'Royal Botanic Gardens, Kew', address: 'Richmond', postcode: 'TW9 3AE', distanceFromSE20: 12 },
        isLocal: false,
        timing: { date: '2026-07-01', startTime: '10:00', endTime: '19:00', isRecurring: true, recurringPattern: 'Daily' },
        pricing: { isFree: false, childPrice: 0, adultPrice: 21, priceNotes: 'Under 16s free! Book online.' },
        costBracket: 'medium',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Buggy friendly', 'Cafe on-site', 'Parking available', 'Baby changing'],
        highlights: ['Childrens Garden', 'Treetop Walkway', 'Palm House', 'Summer Trails'],
        source: 'manual',
        sourceUrl: 'https://www.kew.org',
        averageRating: 4.7,
      },
      {
        title: 'Polka Theatre - Summer Festival',
        description: 'The UKs national theatre for children presents summer shows and workshops. Productions designed specifically for young audiences in a purpose-built venue.',
        shortDescription: 'UKs national theatre for children with summer shows, workshops and playground.',
        category: 'theatre',
        categories: ['theatre', 'workshop'],
        location: { name: 'Polka Theatre', address: '240 The Broadway, Wimbledon', postcode: 'SW19 1SB', distanceFromSE20: 7 },
        isLocal: false,
        timing: { date: '2026-08-05', startTime: '14:00', endTime: '15:30' },
        pricing: { isFree: false, childPrice: 16, adultPrice: 16, familyPrice: 56, priceNotes: 'Workshop packages available' },
        costBracket: 'medium',
        imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
        suitableForToddlers: true,
        suitableForPreschool: true,
        features: ['Cafe on-site', 'Baby changing', 'Outdoor playground'],
        highlights: ['Shows for babies to 13s', 'Creative workshops', 'Outdoor playground'],
        source: 'manual',
        sourceUrl: 'https://polkatheatre.com',
        averageRating: 4.6,
      },
    ];

    return curatedEvents.map((event, index) => ({
      ...event,
      id: `curated-${index}-${Date.now()}`,
      ageRange: event.ageRange || 'all-ages',
      scrapedAt: now,
      updatedAt: now,
    } as KidsEvent));
  }

  /**
   * Fetch all events from all sources
   */
  async fetchAllEvents(filters?: EventFilters): Promise<KidsEvent[]> {
    // Start with curated events (always available)
    let allEvents = this.getCuratedSummerEvents();

    // Try to fetch from external sources
    try {
      const [eventbriteEvents, timeoutEvents, visitLondonEvents] = await Promise.allSettled([
        this.fetchEventbriteEvents(),
        this.fetchTimeoutEvents(),
        this.fetchVisitLondonEvents(),
      ]);

      if (eventbriteEvents.status === 'fulfilled') {
        allEvents = [...allEvents, ...eventbriteEvents.value];
      }
      if (timeoutEvents.status === 'fulfilled') {
        allEvents = [...allEvents, ...timeoutEvents.value];
      }
      if (visitLondonEvents.status === 'fulfilled') {
        allEvents = [...allEvents, ...visitLondonEvents.value];
      }
    } catch (error) {
      console.error('Error fetching external events:', error);
    }

    // Apply filters
    if (filters) {
      allEvents = this.applyFilters(allEvents, filters);
    }

    // Sort: local first, then by date, then by rating
    allEvents.sort((a, b) => {
      // Local events first
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;

      // Then by distance
      if (a.location.distanceFromSE20 && b.location.distanceFromSE20) {
        if (a.location.distanceFromSE20 !== b.location.distanceFromSE20) {
          return a.location.distanceFromSE20 - b.location.distanceFromSE20;
        }
      }

      // Then by date
      if (a.timing.date !== b.timing.date) {
        return new Date(a.timing.date).getTime() - new Date(b.timing.date).getTime();
      }

      // Then by rating
      return (b.averageRating || 0) - (a.averageRating || 0);
    });

    return allEvents;
  }

  /**
   * Apply filters to events
   */
  private applyFilters(events: KidsEvent[], filters: EventFilters): KidsEvent[] {
    return events.filter(event => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.location.name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        const hasCategory = filters.categories.some(cat =>
          event.category === cat || event.categories?.includes(cat)
        );
        if (!hasCategory) return false;
      }

      // Free filter
      if (filters.isFree && !event.pricing.isFree) return false;

      // Cost bracket filter
      if (filters.costBracket && filters.costBracket.length > 0) {
        if (!filters.costBracket.includes(event.costBracket)) return false;
      }

      // Distance filter
      if (filters.maxDistance && event.location.distanceFromSE20) {
        if (event.location.distanceFromSE20 > filters.maxDistance) return false;
      }

      // Local only filter
      if (filters.isLocal && !event.isLocal) return false;

      // Date filters
      if (filters.dateFrom) {
        if (event.timing.date < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        if (event.timing.date > filters.dateTo) return false;
      }

      return true;
    });
  }

  /**
   * Get events suitable for our kids (2.5 and 5.5)
   */
  async getKidsSuitableEvents(): Promise<KidsEvent[]> {
    const allEvents = await this.fetchAllEvents();
    return allEvents.filter(event =>
      event.suitableForToddlers || event.suitableForPreschool
    );
  }

  /**
   * Get local events (SE20 area)
   */
  async getLocalEvents(): Promise<KidsEvent[]> {
    return this.fetchAllEvents({ isLocal: true });
  }

  /**
   * Get free events
   */
  async getFreeEvents(): Promise<KidsEvent[]> {
    return this.fetchAllEvents({ isFree: true });
  }
}

export const kidsEventsScraperService = new KidsEventsScraperService();
export default kidsEventsScraperService;
