import {
  Brackets,
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { ENTITY_MANAGER_KEY } from './transaction.interceptor';
import { FastifyRequest } from 'fastify';
import { IAdvanceFilter, IOptionCustomQuery } from '@dto/base.dto';
import { UUIDV4 } from '@helper/uuid.helper';

/**
 * BaseService
 * TH: คลาสพื้นฐานสำหรับ Service ที่ต้องทำงานกับฐานข้อมูล โดยรวบรวม utility ที่ใช้บ่อย
 * - การเข้าถึง Repository ภายใต้ Transaction (ถ้ามี interceptor สร้าง EntityManager ไว้)
 * - สร้าง Query แบบปรับแต่ง (CustomQuery) รองรับ alias และ preload relations
 * - ฟังก์ชัน AdvanceFilter สำหรับทำงาน Filter/Search/Sort/Group/Pagination ที่ซับซ้อน
 *
 * EN: Provides common database query utilities:
 * - Repository access with transaction awareness
 * - Dynamic query builder with alias & preload
 * - Rich filtering: basic filters, nested relation filters, search, sort, group, pagination
 */
export class BaseService {
  /**
   * Constructor
   * @param dataSource - TypeORM DataSource instance.
   * @param request - FastifyRequest (ใช้เพื่อดึง headers และ EntityManager จาก interceptor)
   *
   * TH: เก็บ DataSource สำหรับสร้าง Repository และใช้ request เพื่อ:
   *  - อ่าน app_id จาก headers
   *  - ดึง EntityManager ที่อยู่ใน Transaction (ผ่าน ENTITY_MANAGER_KEY) ถ้ามี
   */

  constructor(
    private dataSource: DataSource,
    private request: FastifyRequest,
  ) {}

  /**
   * AppId
   * TH: คืนค่า app_id จาก request headers ถ้าไม่มีจะใช้ค่า default ที่กำหนด
   *    - ใช้สำหรับแยกข้อมูล multi-tenant หรือ multi-application
   * EN: Retrieves application id from headers, falls back to default UUID.
   */
  get AppId() {
    return (
      (this.request.headers['app_id'] as string) ??
      '20c9275b-da37-46f3-885e-025f883cda2b'
    );
  }

  /**
   * getRepository
   * TH: คืน Repository ของ Entity ที่ระบุ
   *    - ถ้ามี Transaction Interceptor ทำงาน จะใช้ EntityManager จาก request เพื่อให้ query อยู่ใน transaction
   *    - หากไม่มี จะใช้ global DataSource.manager
   * @param entityCls - คลาสของเอนทิตี้
   * EN: Returns repository using transactional EntityManager if present.
   */
  protected getRepository<T>(entityCls: new () => T): Repository<T> {
    const entityManager: EntityManager =
      this.request[ENTITY_MANAGER_KEY] ?? this.dataSource.manager;
    return entityManager.getRepository(entityCls);
  }

  /**
   * CustomQuery
   * TH: สร้าง SelectQueryBuilder พร้อม:
   *    - alias ของตาราง (table_alias)
   *    - preload ความสัมพันธ์ (leftJoinAndSelect) ตามรายการใน option.preload
   * หมายเหตุ: preload ใช้ left join เพื่อดึงข้อมูล relation ในครั้งเดียว ลด N+1
   * @param repository - คลาสเอนทิตี้
   * @param option - ตัวเลือกปรับแต่ง (alias, preload relations)
   * EN: Creates query builder with optional alias and eager left joins.
   */
  protected CustomQuery<T>(
    repository: new () => T,
    option?: IOptionCustomQuery,
  ): SelectQueryBuilder<T> {
    let q = null;
    if (option && option.table_alias && option.table_alias !== '') {
      q = this.getRepository(repository).createQueryBuilder(option.table_alias);
    } else {
      q = this.getRepository(repository).createQueryBuilder();
    }
    if (
      option &&
      option.preload &&
      option.preload.length > 0 &&
      option.preload
    ) {
      option.preload.forEach((preload) => {
        q = q.leftJoinAndSelect(
          option.table_alias ? `${option.table_alias}.${preload}` : preload,
          preload,
        );
      });
    }
    return q;
  }

  /**
   * CustomQueryWithAppId
   * TH: สร้าง QueryBuilder พร้อม where เงื่อนไข app_id เพื่อจำกัดข้อมูลตาม tenant/application
   * @param repository - เอนทิตี้
   * @param option - ตัวเลือกเพิ่มเติม (alias, preload)
   * EN: Adds app_id constraint to base custom query.
   */
  protected CustomQueryWithAppId<T>(
    repository: new () => T,
    option?: IOptionCustomQuery,
  ): SelectQueryBuilder<T> {
    const tableDotAppId = option?.table_alias
      ? `${option.table_alias}.app_id`
      : 'app_id';
    return this.CustomQuery(repository, option).where(
      `${tableDotAppId} = :appId`,
      { appId: (this.request.headers['app_id'] as string) ?? '1' },
    );
  }

  /**
   * AdvanceFilter
   * TH: ประมวลผลตัวกรองขั้นสูงสำหรับรายการข้อมูล รองรับ:
   *   1) Basic Filter: filter_by + filter (IN / NOT IN โดยใช้ '!' นำหน้าเพื่อ exclude)
   *   2) Nested Relation Filter: filter_nested_by + filter_nested (สร้าง EXISTS ต่อ relation)
   *      - เงื่อนไข AND: ต้องมีทุกค่า -> สร้างหลาย EXISTS เชื่อมด้วย AND
   *      - เงื่อนไข OR: มีอย่างน้อยหนึ่งค่า -> OR หลาย EXISTS
   *   3) Search: ค้นหาคล้าย (LIKE) หลายคอลัมน์ (รองรับ JSON field ด้วย JSON_EXTRACT)
   *   4) Start/End Range: กรองช่วงเวลาหรือค่าตัวเลข start_by / end_by พร้อม condition and/or
   *   5) Sort: เรียงหลายคอลัมน์ (รองรับ JSON field โดย addSelect แล้ว orderBy alias)
   *   6) Group: สร้าง subquery เพื่อดึง MAX/MIN ตาม group_sort_by ต่อ group_by
   *   7) Pagination: page + per_page
   *
   * EN: Applies advanced filtering (basic & nested relations), search, range filters,
   *     sorting, grouping aggregation and pagination. Returns data + total count.
   * @param query - Advanced query parameters
   * @param repository - Entity class
   * @param option - Custom query options (alias, preload, app_id, parent_table etc.)
   * @returns { data, total } - ข้อมูลหลังกรอง + จำนวนทั้งหมดก่อน pagination
   */
  async AdvanceFilter<T>(
    query: IAdvanceFilter,
    repository: new () => T,
    option?: IOptionCustomQuery,
  ): Promise<{
    data: T[];
    total: number;
  }> {
    let q = this.CustomQuery<T>(repository, option);

    if (option && option.app_id) {
      q = this.CustomQueryWithAppId(repository, option);
    }

    if (option && option.table_alias && option.parent_table) {
      q = this.CustomQueryParentWithAppId(repository, option);
    }

    let total = 0;
    // Filter (supports exclusion with '!' prefix in filter values)
    // TH: ระบบ Filter แบบพื้นฐาน ใช้ IN/NOT IN:
    //     - ถ้าค่าเริ่มด้วย '!' จะถือเป็นค่าที่ต้องการ exclude (NOT IN)
    //     - รองรับหลายคอลัมน์และหลายค่าในแต่ละคอลัมน์
    if (
      query.filter_by &&
      query.filter_by.length > 0 &&
      query.filter &&
      query.filter.length > 0
    ) {
      const buildExpr = (col: string) => {
        if (col.includes('.')) {
          const [jsonColumn, jsonField] = col.split('.');
          return `JSON_UNQUOTE(JSON_EXTRACT(${
            option?.table_alias
              ? `${option.table_alias}.${jsonColumn}`
              : jsonColumn
          }, '$.${jsonField}'))`;
        }
        return `${option?.table_alias ? `${option.table_alias}.${col}` : col}`;
      };

      if (query.filter_condition === 'and') {
        q = q.andWhere(
          new Brackets((qb) => {
            query.filter_by.forEach((filter_by, index) => {
              const rawValues = Array.isArray(query.filter[index])
                ? query.filter[index]
                : [query.filter[index]];

              const includeVals = rawValues.filter(
                (v) => !(typeof v === 'string' && v.startsWith('!')),
              );
              const excludeVals = rawValues
                .filter((v) => typeof v === 'string' && v.startsWith('!'))
                .map((v: string) => v.substring(1));

              if (includeVals.length === 0 && excludeVals.length === 0) return;

              const uuid = UUIDV4().split('-')[0];
              const keyBase = `${uuid}_${index}`;
              const keyIn = `${keyBase}_in`;
              const keyNotIn = `${keyBase}_notin`;
              const expr = buildExpr(filter_by);

              if (includeVals.length > 0) {
                qb = qb.andWhere(`${expr} IN (:...${keyIn})`, {
                  [keyIn]: includeVals,
                });
              }
              if (excludeVals.length > 0) {
                qb = qb.andWhere(`${expr} NOT IN (:...${keyNotIn})`, {
                  [keyNotIn]: excludeVals,
                });
              }
            });
          }),
        );
      } else {
        // Condition 'or'
        q = q.andWhere(
          new Brackets((qb) => {
            query.filter_by.forEach((filter_by, index) => {
              const rawValues = Array.isArray(query.filter[index])
                ? query.filter[index]
                : [query.filter[index]];

              const includeVals = rawValues.filter(
                (v) => !(typeof v === 'string' && v.startsWith('!')),
              );
              const excludeVals = rawValues
                .filter((v) => typeof v === 'string' && v.startsWith('!'))
                .map((v: string) => v.substring(1));

              if (includeVals.length === 0 && excludeVals.length === 0) return;

              const uuid = UUIDV4().split('-')[0];
              const keyBase = `${uuid}_${index}`;
              const keyIn = `${keyBase}_in`;
              const keyNotIn = `${keyBase}_notin`;
              const expr = buildExpr(filter_by);

              qb = qb.orWhere(
                new Brackets((subQb) => {
                  if (includeVals.length > 0) {
                    subQb.andWhere(`${expr} IN (:...${keyIn})`, {
                      [keyIn]: includeVals,
                    });
                  }
                  if (excludeVals.length > 0) {
                    subQb.andWhere(`${expr} NOT IN (:...${keyNotIn})`, {
                      [keyNotIn]: excludeVals,
                    });
                  }
                }),
              );
            });
          }),
        );
      }
    }

    // Filter nested (ปรับปรุง AND semantics: ต้องมีครบทุกค่าใน array สำหรับแต่ละ filter_nested_by)
    // TH: Nested relation filtering:
    //     - ใช้ Relation metadata เพื่อ map property -> table + FK
    //     - สร้าง EXISTS เพื่อให้ DB ทำงานเฉพาะชุดที่สัมพันธ์จริง ลด false positive จากการ join ธรรมดา
    if (
      query.filter_nested &&
      query.filter_nested.length > 0 &&
      query.filter_nested_by &&
      query.filter_nested_by.length > 0
    ) {
      /**
       * Nested Relation Filtering Design
       * TH:
       *  เป้าหมาย:
       *    - AND: ต้องมี "ครบทุกค่า" ใน array (ทุกสมาชิก/role ที่ระบุต้องพบใน relation)
       *    - OR: มี "อย่างน้อยหนึ่งค่า" ในชุด (ยืดหยุ่น)
       *    - รองรับหลายฟิลด์ relation ในอนาคต (เช่น members.reference_email + members.role)
       *
       *  กลยุทธ์:
       *    - ใช้ relation metadata ของ TypeORM เพื่อสร้าง relationMetaMap (propertyName -> tableName, fkColumn)
       *    - AND: สร้าง EXISTS ต่อค่าแต่ละตัว เชื่อมด้วย AND (แม่นยำกว่าการใช้ IN เดียว)
       *    - OR: รวมค่าเป็น IN เดียวใน EXISTS หรือหลาย EXISTS ต่อ relation
       *    - ใช้ preload ที่สร้างก่อนหน้า ไม่ join ซ้ำ ลดภาระ query planner
       *    - เพิ่ม debug log เพื่อตรวจสอบ SQL ที่สร้าง ช่วย debug เงื่อนไขซับซ้อน
       *
       * EN:
       *    Implements precise AND / flexible OR semantics for nested relation filtering
       *    via EXISTS subqueries and relation metadata introspection.
       */
      const rootAlias =
        option?.table_alias && option.table_alias !== ''
          ? option.table_alias
          : q.alias;

      const rootMeta = this.dataSource.getMetadata(repository);
      const relationMetaMap: Record<
        string,
        { propertyName: string; tableName: string; fkColumn: string }
      > = {};

      rootMeta.relations.forEach((rel) => {
        const propertyName = rel.propertyName;
        const tableName = rel.inverseEntityMetadata.tableName;
        const fkColumn =
          rel.inverseRelation?.joinColumns?.[0]?.databaseName ||
          rel.joinColumns?.[0]?.databaseName ||
          `${rootMeta.tableName.replace(/s$/, '')}_id`;
        relationMetaMap[propertyName] = { propertyName, tableName, fkColumn };
        relationMetaMap[tableName] = { propertyName, tableName, fkColumn };
      });

      interface IPrepared {
        tableName: string;
        fkColumn: string;
        column: string;
        values: (string | number)[];
      }
      const prepared: IPrepared[] = [];

      query.filter_nested_by.forEach((nestedBy, idx) => {
        const [rawRel, column] = nestedBy.split('.');
        const meta = relationMetaMap[rawRel];
        if (!meta) return;
        prepared.push({
          tableName: meta.tableName,
          fkColumn: meta.fkColumn,
          column,
          values: Array.isArray(query.filter_nested?.[idx])
            ? query.filter_nested[idx]
            : [],
        });
      });

      q = q.andWhere(
        new Brackets((qb) => {
          if (query.filter_nested_condition === 'and') {
            // AND semantics: require a single related row that satisfies all column conditions per relation
            const existsDebugParts: string[] = [];
            // Group prepared items by tableName so we can require columns to match on the same row
            const grouped: Record<
              string,
              {
                fkColumn: string;
                conditions: { column: string; values: (string | number)[] }[];
              }
            > = {};
            prepared.forEach((p) => {
              if (!grouped[p.tableName]) {
                grouped[p.tableName] = { fkColumn: p.fkColumn, conditions: [] };
              }
              grouped[p.tableName].conditions.push({
                column: p.column,
                values: p.values,
              });
            });

            Object.keys(grouped).forEach((tableName) => {
              const group = grouped[tableName];
              // skip if no values present for this group
              const hasValues = group.conditions.some(
                (c) => c.values && c.values.length > 0,
              );
              if (!hasValues) return;

              const uuid = UUIDV4().split('-')[0];
              const subAlias = `sub_${tableName}_${uuid}`;
              const params: Record<string, any> = {};
              const condParts: string[] = [];

              group.conditions.forEach((c, cIdx) => {
                if (!c.values || c.values.length === 0) return;
                const key = `nested_and_${uuid}_${cIdx}`;
                if (c.values.length === 1) {
                  condParts.push(`${subAlias}.${c.column} = :${key}`);
                  params[key] = c.values[0];
                } else {
                  condParts.push(`${subAlias}.${c.column} IN (:...${key})`);
                  params[key] = c.values;
                }
              });

              if (condParts.length === 0) return;

              const existsSql = `EXISTS (SELECT 1 FROM ${tableName} ${subAlias} WHERE ${subAlias}.${
                group.fkColumn
              } = ${rootAlias}.id AND (${condParts.join(' AND ')}))`;

              qb = qb.andWhere(existsSql, params);
              existsDebugParts.push(`${existsSql} [${JSON.stringify(params)}]`);
            });

            // Debug log
            // eslint-disable-next-line no-console
            console.debug(
              '[AdvanceFilter][nested][AND] EXISTS conditions:',
              existsDebugParts,
            );
          } else {
            // OR semantics: อย่างน้อยหนึ่งค่าจากทุก relation (รวม IN ต่อ relation)
            const orDebugParts: string[] = [];
            prepared.forEach((p, pIdx) => {
              if (p.values.length === 0) return;
              const uuid = UUIDV4().split('-')[0];
              const paramKey = `nested_or_${uuid}_${pIdx}`;
              const existsSql = `EXISTS (SELECT 1 FROM ${p.tableName} sub_${p.tableName}_${uuid} WHERE sub_${p.tableName}_${uuid}.${p.fkColumn} = ${rootAlias}.id AND sub_${p.tableName}_${uuid}.${p.column} IN (:...${paramKey}))`;
              qb = qb.orWhere(existsSql, { [paramKey]: p.values });
              orDebugParts.push(
                `${existsSql} [${paramKey}=${JSON.stringify(p.values)}]`,
              );
            });
            // Debug log
            // eslint-disable-next-line no-console
            console.debug(
              '[AdvanceFilter][nested][OR] EXISTS conditions:',
              orDebugParts,
            );
          }
        }),
      );

      q = q.distinct(true);
    }

    //Search
    // TH: ระบบค้นหาแบบ partial (LIKE) รองรับหลายคอลัมน์ + JSON field ผ่าน JSON_EXTRACT
    if (
      query.search &&
      query.search !== '' &&
      query.search_by &&
      query.search_by.length > 0
    ) {
      q = q.andWhere(
        new Brackets((qb) => {
          query.search_by.map((search_by) => {
            if (search_by.includes('.')) {
              const [jsonColumn, jsonField] = search_by.split('.');
              qb = qb.orWhere(
                `JSON_UNQUOTE(JSON_EXTRACT(${
                  option?.table_alias
                    ? `${option.table_alias}.${jsonColumn}`
                    : jsonColumn
                }, '$.${jsonField}')) like :search`,
                {
                  search: `%${query.search}%`,
                },
              );
            } else {
              qb = qb.orWhere(
                `${
                  option?.table_alias
                    ? `${option.table_alias}.${search_by}`
                    : search_by
                } like :search`,
                {
                  search: `%${query.search}%`,
                },
              );
            }
          });
        }),
      );
    }

    //Start And End
    // TH: กรองช่วง (Range) โดยใช้ start_by / end_by รองรับ condition 'and' หรือ 'or'
    if ((query.start && query.start_by) || (query.end && query.end_by)) {
      q = q.andWhere(
        new Brackets((qb) => {
          if (query.start_and_end_condition === 'and') {
            //Start
            if (query.start && query.start_by) {
              if (query.start_by.includes('.')) {
                const [jsonColumn, jsonField] = query.start_by.split('.');
                qb = qb.andWhere(
                  `JSON_UNQUOTE(JSON_EXTRACT(${
                    option?.table_alias
                      ? `${option.table_alias}.${jsonColumn}`
                      : jsonColumn
                  }, '$.${jsonField}')) >= :start_date`,
                  {
                    start_date: query.start,
                  },
                );
              } else {
                qb = qb.andWhere(
                  `${
                    option?.table_alias
                      ? `${option.table_alias}.${query.start_by}`
                      : query.start_by
                  } >= :start_date`,
                  {
                    start_date: query.start,
                  },
                );
              }
            }

            //End
            if (query.end && query.end_by) {
              if (query.end_by.includes('.')) {
                const [jsonColumn, jsonField] = query.end_by.split('.');
                qb = qb.andWhere(
                  `JSON_UNQUOTE(JSON_EXTRACT(${
                    option?.table_alias
                      ? `${option.table_alias}.${jsonColumn}`
                      : jsonColumn
                  }, '$.${jsonField}')) >= :end_date`,
                  {
                    end_date: query.end,
                  },
                );
              } else {
                qb = qb.andWhere(
                  `${
                    option?.table_alias
                      ? `${option.table_alias}.${query.end_by}`
                      : query.end_by
                  } <= :end_date`,
                  {
                    end_date: query.end,
                  },
                );
              }
            }
          } else {
            //Start
            if (query.start && query.start_by) {
              if (query.start_by.includes('.')) {
                const [jsonColumn, jsonField] = query.start_by.split('.');
                qb = qb.orWhere(
                  `JSON_UNQUOTE(JSON_EXTRACT(${
                    option?.table_alias
                      ? `${option.table_alias}.${jsonColumn}`
                      : jsonColumn
                  }, '$.${jsonField}')) >= :start_date`,
                  {
                    start_date: query.start,
                  },
                );
              } else {
                qb = qb.orWhere(
                  `${
                    option?.table_alias
                      ? `${option.table_alias}.${query.start_by}`
                      : query.start_by
                  } >= :start_date`,
                  {
                    start_date: query.end,
                  },
                );
              }
            }

            //End
            if (query.end && query.end_by) {
              if (query.end_by.includes('.')) {
                const [jsonColumn, jsonField] = query.end_by.split('.');
                qb = qb.orWhere(
                  `JSON_UNQUOTE(JSON_EXTRACT(${
                    option?.table_alias
                      ? `${option.table_alias}.${jsonColumn}`
                      : jsonColumn
                  }, '$.${jsonField}')) >= :end_date`,
                  {
                    end_date: query.end,
                  },
                );
              } else {
                qb = qb.orWhere(
                  `${
                    option?.table_alias
                      ? `${option.table_alias}.${query.end_by}`
                      : query.end_by
                  } <= :end_date`,
                  {
                    end_date: query.end,
                  },
                );
              }
            }
          }
          return qb;
        }),
      );
    }

    //Sort
    // TH: เรียงลำดับหลายคอลัมน์ รองรับ JSON field (เพิ่ม select เป็น alias ก่อน order)
    if (query.sort && query.sort_by && query.sort_by.length > 0) {
      for (let i = 0; i < query.sort_by.length; i++) {
        if (query.sort_by[i].includes('.')) {
          const [jsonColumn, jsonField] = query.sort_by[i].split('.');
          const uuid = UUIDV4().split('-')[0];
          q = q.addSelect(
            `JSON_UNQUOTE(JSON_EXTRACT(${
              option?.table_alias
                ? `${option.table_alias}.${jsonColumn}`
                : jsonColumn
            }, '$.${jsonField}'))`,
            uuid,
          );
          q = q.orderBy(uuid, query.sort[i].toUpperCase() as 'DESC' | 'ASC');
        } else {
          q = q.orderBy(
            `${
              option?.table_alias
                ? `${option.table_alias}.${query.sort_by[i]}`
                : query.sort_by
            }`,
            query.sort[i].toUpperCase() as 'DESC' | 'ASC',
          );
        }
      }
    }

    //Group
    // TH: กลุ่มข้อมูลและเลือก MAX/MIN ของ group_sort_by ต่อชุด group_by
    if (query.group_by && query.group_sort && query.group_sort_by) {
      let onTable = '';
      query.group_by.forEach((group_by, index) => {
        if (index !== 0) {
          onTable = onTable + ` AND ${group_by} = ${group_by}`;
        } else {
          onTable = `${group_by} = ${group_by}`;
        }
      });

      q = q.innerJoinAndSelect(
        (qb) => {
          qb = qb
            .select(query.group_by.map((select) => `sub.${select}`))
            .from(repository, 'sub');

          if (query.group_sort === 'max') {
            qb = qb.addSelect(
              `MAX(sub.${query.group_sort_by})`,
              'group_sort_value',
            );
          } else {
            qb = qb.addSelect(
              `MIN(sub.${query.group_sort_by})`,
              'group_sort_value',
            );
          }

          if (query.group_by.length > 0) {
            for (const group of query.group_by) {
              qb = qb.addGroupBy(`sub.${group}`);
            }
          }
          return qb;
        },
        // StockEntity,
        'subQuery',
        onTable +
          ` AND group_sort_value = ${
            option.table_alias ? option.table_alias + '.' : undefined
          }${query.group_sort_by}`,
      );
    }

    total = (await q.getMany()).length;

    //Pagination
    // TH: แบ่งหน้า skip/take โดย page เริ่มที่ 1
    if (
      query.page &&
      query.page !== 0 &&
      query.per_page &&
      query.per_page !== 0
    ) {
      // if (query.page <= 1) query.page = 0;
      q = q.skip((query.page - 1) * query.per_page).take(query.per_page);
    }
    return {
      data: await q.getMany(),
      total,
    };
  }

  /**
   * CustomQueryParentWithAppId
   * TH: สร้าง QueryBuilder พร้อม innerJoin ไปยัง parent_table ที่มีเงื่อนไข app_id
   *     ใช้ในกรณีต้องการ validate ความสัมพันธ์ของข้อมูลกับแอปพลิเคชันต้นทาง
   * @param repository - เอนทิตี้หลัก
   * @param option - ต้องมี parent_table + อาจมี table_alias
   * EN: Adds inner join on parent_table constrained by app_id.
   */
  protected CustomQueryParentWithAppId<T>(
    repository: new () => T,
    option?: IOptionCustomQuery,
  ) {
    // const tableDotAppId = option?.table_alias
    return this.CustomQuery(repository, option).innerJoinAndSelect(
      `${option.table_alias}.${option.parent_table}`,
      `${option.parent_table}`,
      `${option.parent_table}.app_id = :app_id`,
      { app_id: this.AppId },
    );
  }
}
