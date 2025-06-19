import { supabase } from '../lib/supabaseClient';
import * as tus from 'tus-js-client';

export interface TusUploadResult {
  success: boolean;
  path: string;
  finalMimeType: string; // NEW: Return the effective MIME type used
  error?: string;
}

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
}

class StorageService {
  private readonly BUCKET_NAME = 'premium-uploads';
  private readonly TUS_ENDPOINT: string;

  constructor() {
    // Extract project ID from Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL environment variable is not set');
    }
    
    // Extract project ID from URL like https://abc123.supabase.co
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    if (!projectId) {
      throw new Error('Could not extract project ID from Supabase URL');
    }
    
    this.TUS_ENDPOINT = `https://${projectId}.supabase.co/storage/v1/upload/resumable`;
    console.log('🔧 TUS endpoint configured:', this.TUS_ENDPOINT);
  }

  /**
   * Get the effective MIME type for Gemini API compatibility
   * Converts text/markdown to text/plain as per Gemini API requirements
   */
  private getEffectiveMimeType(file: File): string {
    let effectiveMimeType = file.type || 'application/octet-stream';
    
    if (file.type === 'text/markdown') {
      console.log(`[TUS] Treating markdown file ${file.name} as text/plain for Gemini API compatibility.`);
      effectiveMimeType = 'text/plain';
    }
    
    return effectiveMimeType;
  }

  /**
   * Upload a file using TUS resumable upload protocol
   * This is the recommended method for large files and premium users
   */
  async uploadFileWithTus(
    file: File, 
    userId: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<TusUploadResult> {
    try {
      console.log('🚀 Starting TUS upload for:', {
        fileName: file.name,
        fileSize: file.size,
        originalMimeType: file.type,
        userId: userId.substring(0, 8) + '...'
      });

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Authentication error. Please try again.');
      }

      if (!session?.access_token) {
        throw new Error('No active session. Please sign in.');
      }

      // Get effective MIME type (converts markdown to text/plain)
      const effectiveMimeType = this.getEffectiveMimeType(file);

      // Construct a unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const uniqueFileName = `${timestamp}_${sanitizedFileName.split('.').slice(0, -1).join('.') || sanitizedFileName}.${extension}`;
      const objectPath = `${userId}/${uniqueFileName}`;

      console.log('📁 Generated object path:', objectPath);
      console.log('🔧 Using effective MIME type:', effectiveMimeType);

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: this.TUS_ENDPOINT,
          retryDelays: [0, 3000, 5000, 10000, 20000], // Retry strategy
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
          metadata: {
            bucketName: this.BUCKET_NAME,
            objectName: objectPath, // Full path including user folder
            contentType: effectiveMimeType, // Use the effective MIME type
            cacheControl: '3600', // Cache for 1 hour
          },
          chunkSize: 6 * 1024 * 1024, // Recommended 6MB chunks
          onError: (error) => {
            console.error('❌ TUS Upload Error:', {
              fileName: file.name,
              error: error.message,
              details: error
            });
            reject(new Error(`Failed to upload ${file.name}: ${error.message}`));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            
            console.log(`📊 TUS Progress for ${file.name}: ${bytesUploaded}/${bytesTotal} bytes (${percentage}%)`);
            
            if (onProgress) {
              onProgress({
                bytesUploaded,
                bytesTotal,
                percentage
              });
            }
          },
          onSuccess: () => {
            console.log(`✅ TUS Upload Success for ${file.name}!`);
            console.log('📁 Final object path:', objectPath);
            console.log('🔧 Final MIME type:', effectiveMimeType);
            
            resolve({ 
              success: true, 
              path: objectPath,
              finalMimeType: effectiveMimeType
            });
          },
        });

        console.log('🚀 Starting TUS upload...');
        upload.start();
      });

    } catch (error) {
      console.error('❌ Error in TUS upload setup:', error);
      return {
        success: false,
        path: '',
        finalMimeType: '',
        error: error instanceof Error ? error.message : 'TUS upload setup failed'
      };
    }
  }

  /**
   * Download a file from storage (for backend processing)
   */
  async downloadFile(path: string): Promise<ArrayBuffer> {
    try {
      console.log('📥 Downloading file from storage:', path);

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(path);

      if (error) {
        console.error('❌ Error downloading file:', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No file data received');
      }

      const arrayBuffer = await data.arrayBuffer();
      console.log('✅ File downloaded successfully:', {
        path,
        size: arrayBuffer.byteLength
      });

      return arrayBuffer;

    } catch (error) {
      console.error('❌ Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Get a public URL for a file (if bucket is public)
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Create a signed URL for temporary access to a private file
   */
  async createSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned');
      }

      return data.signedUrl;

    } catch (error) {
      console.error('❌ Error creating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting file from storage:', path);

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('❌ Error deleting file:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      console.log('✅ File deleted successfully:', path);
      return true;

    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }

  /**
   * List files for a user
   */
  async listUserFiles(userId: string): Promise<string[]> {
    try {
      console.log('📋 Listing files for user:', userId.substring(0, 8) + '...');

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId);

      if (error) {
        console.error('❌ Error listing files:', error);
        throw new Error(`Failed to list files: ${error.message}`);
      }

      const filePaths = data?.map(file => `${userId}/${file.name}`) || [];
      console.log('✅ Files listed successfully:', filePaths.length);

      return filePaths;

    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(path);

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string): Promise<{ size: number; lastModified: string; contentType: string } | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const file = data[0];
      return {
        size: file.metadata?.size || 0,
        lastModified: file.updated_at || file.created_at || '',
        contentType: file.metadata?.mimetype || 'application/octet-stream'
      };

    } catch (error) {
      console.error('❌ Error getting file metadata:', error);
      return null;
    }
  }
}

export const storageService = new StorageService();