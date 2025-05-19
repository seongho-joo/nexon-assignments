import { ClassConstructor, plainToClass } from 'class-transformer';
import { Document, Types } from 'mongoose';

/**
 * MongoDB ObjectId를 string으로 변환
 */
export function toObjectId(id: unknown): string {
  if (id instanceof Types.ObjectId) {
    return id.toString();
  }
  return String(id);
}

/**
 * Mongoose 문서에서 순수 데이터만 추출
 */
function extractDocumentData(doc: any): Record<string, any> {
  if (doc instanceof Document) {
    return doc.toObject();
  }

  // _doc 프로퍼티가 있는 경우 (Mongoose 문서)
  if (doc._doc) {
    return { ...doc._doc };
  }

  // 일반 객체인 경우
  return { ...doc };
}

/**
 * 엔티티를 DTO로 변환
 */
export function transformToDto<T, V extends Record<string, any>>(
  dto: ClassConstructor<T>,
  entity: V,
): T {
  const documentData = extractDocumentData(entity);
  const plainObject: Record<string, any> = { ...documentData };

  // MongoDB ObjectId 처리
  if (plainObject['_id']) {
    plainObject['id'] = toObjectId(plainObject['_id']);
    // _id를 보존하여 @Transform 데코레이터가 사용할 수 있도록 함
  }

  // 내부 메타데이터 제거
  delete plainObject['__v'];
  delete plainObject['$__'];
  delete plainObject['$isNew'];

  // 모든 ObjectId 필드를 string으로 변환
  Object.keys(plainObject).forEach(key => {
    if (plainObject[key] instanceof Types.ObjectId) {
      plainObject[key] = toObjectId(plainObject[key]);
    }
  });

  const result = plainToClass(dto, plainObject, {
    excludeExtraneousValues: true,
    exposeUnsetFields: false,
  });

  return result;
}

/**
 * 엔티티 배열을 DTO 배열로 변환
 */
export function transformToDtoArray<T, V extends Record<string, any>>(
  dto: ClassConstructor<T>,
  entities: V[],
): T[] {
  return entities.map(entity => transformToDto(dto, entity));
}

/**
 * 페이지네이션된 엔티티를 DTO로 변환
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
}

export function transformToPaginatedDto<T, V extends Record<string, any>>(
  dto: ClassConstructor<T>,
  entities: V[],
  totalCount: number,
): PaginatedResponse<T> {
  return {
    items: transformToDtoArray(dto, entities),
    totalCount,
  };
}
