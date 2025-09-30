'use client';

import React, { useState } from 'react';
import { FamilyPhoto, FamilyAlbum, FamilyMember } from '@/types/family.types';
import {
  Camera,
  Image,
  Upload,
  Download,
  Share2,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Calendar,
  Users,
  Heart,
  Star,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  MapPin,
  Clock,
  Folder,
  FolderPlus
} from 'lucide-react';

interface FamilyPhotoManagerProps {
  photos: FamilyPhoto[];
  albums: FamilyAlbum[];
  familyMembers: FamilyMember[];
  onUploadPhoto: (photo: Partial<FamilyPhoto>) => void;
  onCreateAlbum: (album: Partial<FamilyAlbum>) => void;
  onDeletePhoto: (id: string) => void;
  onUpdatePhoto: (id: string, photo: Partial<FamilyPhoto>) => void;
}

export const FamilyPhotoManager: React.FC<FamilyPhotoManagerProps> = ({
  photos: initialPhotos,
  albums: initialAlbums,
  familyMembers,
  onUploadPhoto,
  onCreateAlbum,
  onDeletePhoto,
  onUpdatePhoto
}) => {
  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [albums, setAlbums] = useState<FamilyAlbum[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<FamilyPhoto | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'views'>('date');

  const mockAlbums: FamilyAlbum[] = [
    {
      id: '1',
      name: 'Family Vacations',
      description: 'Our amazing family trips and adventures',
      coverPhoto: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2023-01-15'),
      photoCount: 47,
      photos: []
    },
    {
      id: '2',
      name: 'Kids Growing Up',
      description: 'Precious moments of Askia and Amari growing up',
      coverPhoto: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      createdAt: new Date('2023-06-20'),
      updatedAt: new Date('2023-06-20'),
      photoCount: 156,
      photos: []
    },
    {
      id: '3',
      name: 'Special Occasions',
      description: 'Birthdays, anniversaries, and celebrations',
      coverPhoto: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800',
      createdAt: new Date('2023-03-10'),
      updatedAt: new Date('2023-03-10'),
      photoCount: 89,
      photos: []
    },
    {
      id: '4',
      name: 'Daily Life',
      description: 'Beautiful moments from our everyday life',
      coverPhoto: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
      createdAt: new Date('2023-08-05'),
      updatedAt: new Date('2023-08-05'),
      photoCount: 234,
      photos: []
    }
  ];

  const mockPhotos: FamilyPhoto[] = [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200',
      caption: 'Amazing family trip to Disney World!',
      dateTaken: new Date('2023-07-15'),
      uploadedBy: 'ade',
      albumId: '1',
      tags: ['disney', 'vacation', 'family', 'fun'],
      location: { lat: 28.5383, lng: -81.3792, name: 'Orlando, Florida' },
      people: ['ade', 'angela', 'askia', 'amari'],
      isPrivate: false,
      views: 45,
      likes: 12,
      fileSize: 2.3,
      uploadedAt: new Date('2023-07-15'),
      peopleTagged: [],
      albums: ['1'],
      isFavorite: false
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200',
      caption: 'Askia\'s first day of middle school',
      dateTaken: new Date('2023-08-20'),
      uploadedBy: 'angela',
      albumId: '2',
      tags: ['school', 'milestone', 'askia', 'education'],
      location: { lat: 33.7490, lng: -84.3880, name: 'Atlanta, Georgia' },
      people: ['askia'],
      isPrivate: false,
      views: 23,
      likes: 8,
      fileSize: 1.8,
      uploadedAt: new Date('2023-08-20'),
      peopleTagged: [],
      albums: ['2'],
      isFavorite: true
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200',
      caption: 'Amari\'s piano recital performance',
      dateTaken: new Date('2023-12-10'),
      uploadedBy: 'angela',
      albumId: '3',
      tags: ['piano', 'recital', 'amari', 'music', 'achievement'],
      location: { lat: 33.7537, lng: -84.3863, name: 'Community Center, Atlanta' },
      people: ['amari'],
      isPrivate: false,
      views: 67,
      likes: 18,
      fileSize: 2.1,
      uploadedAt: new Date('2023-12-10'),
      peopleTagged: [],
      albums: ['3'],
      isFavorite: false
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=200',
      caption: 'Sunday morning pancake breakfast',
      dateTaken: new Date('2024-01-14'),
      uploadedBy: 'ade',
      albumId: '4',
      tags: ['breakfast', 'pancakes', 'sunday', 'family time'],
      location: { lat: 33.7488, lng: -84.3877, name: 'Home' },
      people: ['ade', 'angela', 'askia', 'amari'],
      isPrivate: false,
      views: 31,
      likes: 9,
      fileSize: 1.5,
      uploadedAt: new Date('2024-01-14'),
      peopleTagged: [],
      albums: ['1'],
      isFavorite: true
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200',
      caption: 'Askia wins soccer championship!',
      dateTaken: new Date('2023-10-30'),
      uploadedBy: 'ade',
      albumId: '3',
      tags: ['soccer', 'championship', 'askia', 'sports', 'victory'],
      location: { lat: 33.7553, lng: -84.4006, name: 'Atlanta Sports Complex' },
      people: ['askia'],
      isPrivate: false,
      views: 89,
      likes: 25,
      fileSize: 2.7,
      uploadedAt: new Date('2023-10-30'),
      peopleTagged: [],
      albums: ['2'],
      isFavorite: false
    },
    {
      id: '6',
      url: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=200',
      caption: 'Angela\'s 35th birthday celebration',
      dateTaken: new Date('2023-09-18'),
      uploadedBy: 'ade',
      albumId: '3',
      tags: ['birthday', 'celebration', 'angela', 'party'],
      location: { lat: 33.7488, lng: -84.3877, name: 'Home' },
      people: ['ade', 'angela', 'askia', 'amari'],
      isPrivate: false,
      views: 52,
      likes: 15,
      fileSize: 2.0,
      uploadedAt: new Date('2023-09-18'),
      peopleTagged: [],
      albums: ['3'],
      isFavorite: false
    }
  ];

  // Initialize photos and albums with mock data if no initial data provided
  React.useEffect(() => {
    if (initialPhotos.length === 0 && photos.length === 0) {
      setPhotos(mockPhotos);
    } else if (initialPhotos.length > 0 && photos.length === 0) {
      setPhotos(initialPhotos);
    }

    if (initialAlbums.length === 0 && albums.length === 0) {
      setAlbums(mockAlbums);
    } else if (initialAlbums.length > 0 && albums.length === 0) {
      setAlbums(initialAlbums);
    }
  }, []);

  const filteredPhotos = photos.filter(photo => {
    if (selectedAlbum !== 'all' && photo.albumId !== selectedAlbum) return false;
    if (searchTerm && !(photo.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        !photo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    return true;
  });

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime();
      case 'name':
        return (a.caption || '').localeCompare(b.caption || '');
      case 'views':
        return (b.views || 0) - (a.views || 0);
      default:
        return 0;
    }
  });

  const getAlbumById = (id: string) => {
    return albums.find(album => album.id === id);
  };

  const getMemberById = (id: string) => {
    return familyMembers.find(member => member.id === id);
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  const PhotoGrid: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {sortedPhotos.map((photo) => (
        <div key={photo.id} className="relative group">
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
            <img
              src={photo.thumbnailUrl}
              alt={photo.caption}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedPhoto(photo)}
            />

            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                  type="checkbox"
                  checked={selectedPhotos.includes(photo.id)}
                  onChange={() => handlePhotoSelect(photo.id)}
                  className="w-4 h-4 text-blue-600 border-white rounded focus:ring-blue-500"
                />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{photo.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{photo.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-xs text-gray-600 truncate">{photo.caption}</p>
            <p className="text-xs text-gray-400">
              {new Date(photo.dateTaken).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const PhotoList: React.FC = () => (
    <div className="space-y-3">
      {sortedPhotos.map((photo) => (
        <div key={photo.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="checkbox"
            checked={selectedPhotos.includes(photo.id)}
            onChange={() => handlePhotoSelect(photo.id)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />

          <img
            src={photo.thumbnailUrl}
            alt={photo.caption}
            className="w-12 h-12 object-cover rounded-lg cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          />

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{photo.caption}</h4>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span>{new Date(photo.dateTaken).toLocaleDateString()}</span>
              {photo.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {photo.location.name || `${photo.location.lat}, ${photo.location.lng}`}
                </span>
              )}
              <span>{formatFileSize(photo.fileSize || 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{photo.views}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{photo.likes}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeletePhoto(photo.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Family Photos</h2>
              <p className="text-sm text-gray-600">
                {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''} in {albums.length} album{albums.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateAlbum(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Album
            </button>
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Photos
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-gray-400" />
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Photos</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.name} ({album.photoCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="views">Sort by Views</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedPhotos.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg">
                <span className="text-sm font-medium">{selectedPhotos.length} selected</span>
                <button
                  onClick={() => setSelectedPhotos([])}
                  className="p-1 hover:bg-blue-200 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedAlbum === 'all' && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Albums</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {albums.map(album => (
              <div
                key={album.id}
                onClick={() => setSelectedAlbum(album.id)}
                className="cursor-pointer group"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 border border-gray-200 group-hover:shadow-md transition-shadow">
                  <img
                    src={album.coverPhoto}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="mt-2">
                  <h4 className="font-medium text-gray-900 truncate">{album.name}</h4>
                  <p className="text-sm text-gray-600">{album.photoCount} photos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6">
        {filteredPhotos.length > 0 ? (
          viewMode === 'grid' ? <PhotoGrid /> : <PhotoList />
        ) : (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedAlbum !== 'all'
                ? 'Try adjusting your search or filter to see more photos.'
                : 'Start building your family photo collection by uploading your first photos.'}
            </p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
            >
              <Upload className="w-4 h-4" />
              Upload First Photos
            </button>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="max-w-full max-h-full object-contain"
            />

            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-6">
              <h3 className="text-xl font-semibold mb-2">{selectedPhoto.caption}</h3>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedPhoto.dateTaken).toLocaleDateString()}</span>
                </div>
                {selectedPhoto.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedPhoto.location.name || `${selectedPhoto.location.lat}, ${selectedPhoto.location.lng}`}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {(selectedPhoto.people || []).map(id => getMemberById(id)?.firstName || 'Unknown').join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{selectedPhoto.views} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{selectedPhoto.likes} likes</span>
                  </div>
                </div>
              </div>
              {selectedPhoto.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {selectedPhoto.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Upload Photos</h3>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Drag & drop photos here</p>
                <p className="text-sm text-gray-600 mb-4">or click to browse files</p>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Choose Files
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Album
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Select album...</option>
                    {albums.map(album => (
                      <option key={album.id} value={album.id}>
                        {album.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowUploadForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateAlbum && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create New Album</h3>
                <button
                  onClick={() => setShowCreateAlbum(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Album Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter album name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe this album..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add tags separated by commas"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-700">
                    Make this album private
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateAlbum(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Album
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};