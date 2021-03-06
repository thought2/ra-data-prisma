import * as prisma from '@prisma/client';
import { core } from '@nexus/schema';
import { GraphQLResolveInfo } from 'graphql';

// Types helpers
type IsModelNameExistsInGraphQLTypes<ReturnType> =
  ReturnType extends core.GetGen<'objectNames'>
    ? true
    : false

type CustomFieldResolver<TypeName extends string, FieldName extends string> =
  (
    root: core.RootValue<TypeName>,
    args: core.ArgsValue<TypeName, FieldName>,
    context: core.GetGen<"context">,
    info: GraphQLResolveInfo,
    originalResolve: core.FieldResolver<TypeName, FieldName>
  ) => core.MaybePromise<core.ResultValue<TypeName, FieldName>> | core.MaybePromiseDeep<core.ResultValue<TypeName, FieldName>>

type NexusPrismaScalarOpts<TypeName extends string, MethodName extends string, Alias extends string | undefined> = {
  alias?: Alias
  resolve?: CustomFieldResolver<TypeName, Alias extends undefined ? MethodName : Alias>
} & NexusGenPluginFieldConfig<TypeName, Alias extends undefined ? MethodName : Alias>

type Pagination = {
  skip?: boolean
  take?: boolean
  cursor?: boolean
}

type RootObjectTypes = Pick<core.GetGen<'rootTypes'>, core.GetGen<'objectNames'>>

/**
 * Determine if `B` is a subset (or equivalent to) of `A`.
*/
type IsSubset<A, B> =
  keyof A extends never ? false :
  B extends A           ? true  :
                          false

type OmitByValue<T, ValueType> =
  Pick<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>

type GetSubsetTypes<ModelName extends string> =
  keyof OmitByValue<
    {
      [P in keyof RootObjectTypes]:
        // if
        ModelName extends keyof ModelTypes
        ? IsSubset<RootObjectTypes[P], ModelTypes[ModelName]> extends true
        // else if
        ? RootObjectTypes[P]
        : never
        // else
        : never
    },
    never
  >

type SubsetTypes<ModelName extends string> =
  GetSubsetTypes<ModelName> extends never
    ? `ERROR: No subset types are available. Please make sure that one of your GraphQL type is a subset of your t.model('<ModelName>')`
    : GetSubsetTypes<ModelName>

type DynamicRequiredType<ReturnType extends string> =
  IsModelNameExistsInGraphQLTypes<ReturnType> extends true
    ? { type?: SubsetTypes<ReturnType> }
    : { type: SubsetTypes<ReturnType> }

type GetNexusPrismaInput<
  ModelName extends string,
  MethodName extends string,
  InputName extends 'filtering' | 'ordering'
> =
  ModelName extends keyof NexusPrismaInputs
    ? MethodName extends keyof NexusPrismaInputs[ModelName]
      ? InputName extends keyof NexusPrismaInputs[ModelName][MethodName]
        ? NexusPrismaInputs[ModelName][MethodName][InputName] & string
        : never
      : never
    : never

/**
 *  Represents arguments required by Prisma Client JS that will
 *  be derived from a request's input (args, context, and info)
 *  and omitted from the GraphQL API. The object itself maps the
 *  names of these args to a function that takes an object representing
 *  the request's input and returns the value to pass to the prisma
 *  arg of the same name.
 */
export type LocalComputedInputs<MethodName extends string> =
  Record<
    string,
    (params: LocalMutationResolverParams<MethodName>) => unknown
  >

export type GlobalComputedInputs =
  Record<
    string,
    (params: GlobalMutationResolverParams) => unknown
  >

type BaseMutationResolverParams = {
  info: GraphQLResolveInfo
  ctx: Context
}

export type GlobalMutationResolverParams =
  BaseMutationResolverParams & {
    args: Record<string, any> & { data: unknown }
  }

export type LocalMutationResolverParams<MethodName extends string> =
  BaseMutationResolverParams & {
    args: MethodName extends keyof core.GetGen2<'argTypes', 'Mutation'>
      ? core.GetGen3<'argTypes', 'Mutation', MethodName>
      : any
  }

export type Context = core.GetGen<'context'>

type BaseRelationOptions<TypeName extends string, MethodName extends string, Alias extends string | undefined, ReturnType extends string> =
  DynamicRequiredType<ReturnType> & {
    alias?: Alias
    resolve?: CustomFieldResolver<TypeName, Alias extends undefined ? MethodName : Alias>
    computedInputs?: LocalComputedInputs<MethodName>
  } & NexusGenPluginFieldConfig<TypeName, Alias extends undefined ? MethodName : Alias>

// If GetNexusPrismaInput returns never, it means there are no filtering/ordering args for it.
type NexusPrismaRelationOpts<ModelName extends string, MethodName extends string, Alias extends string | undefined, ReturnType extends string> =
  GetNexusPrismaInput<ModelName, MethodName, 'filtering'> extends never
  ? BaseRelationOptions<ModelName, MethodName, Alias, ReturnType>
  // else if
  : GetNexusPrismaInput<ModelName, MethodName, 'ordering'> extends never
  ? BaseRelationOptions<ModelName, MethodName, Alias, ReturnType>
  // else
  : BaseRelationOptions<ModelName, MethodName, Alias, ReturnType> & {
      filtering?:
        | boolean
        | Partial<Record<GetNexusPrismaInput<ModelName, MethodName, 'filtering'>, boolean>>
      ordering?:
        | boolean
        | Partial<Record<GetNexusPrismaInput<ModelName, MethodName, 'ordering'>, boolean>>
      pagination?: boolean | Pagination
    }

type IsScalar<TypeName extends string> = TypeName extends core.GetGen<'scalarNames'>
  ? true
  : false;

type IsObject<Name extends string> = Name extends core.GetGen<'objectNames'>
  ? true
  : false

type IsEnum<Name extends string> = Name extends core.GetGen<'enumNames'>
  ? true
  : false

type IsInputObject<Name extends string> = Name extends core.GetGen<'inputNames'>
  ? true
  : false

/**
 * The kind that a GraphQL type may be.
 */
type Kind = 'Enum' | 'Object' | 'Scalar' | 'InputObject'

/**
 * Helper to safely reference a Kind type. For example instead of the following
 * which would admit a typo:
 *
 * ```ts
 * type Foo = Bar extends 'scalar' ? ...
 * ```
 *
 * You can do this which guarantees a correct reference:
 *
 * ```ts
 * type Foo = Bar extends AKind<'Scalar'> ? ...
 * ```
 *
 */
type AKind<T extends Kind> = T

type GetKind<Name extends string> =
  IsEnum<Name> extends true
  ? 'Enum'
  // else if
  : IsScalar<Name> extends true
  ? 'Scalar'
  // else if
  : IsObject<Name> extends true
  ? 'Object'
  // else if
  : IsInputObject<Name> extends true
  ? 'InputObject'
  // else
  // FIXME should be `never`, but GQL objects named differently
  // than backing type fall into this branch
  : 'Object'

type NexusPrismaFields<ModelName extends keyof NexusPrismaTypes & string> = {
  [MethodName in keyof NexusPrismaTypes[ModelName] & string]:
    NexusPrismaMethod<
      ModelName,
      MethodName,
      GetKind<NexusPrismaTypes[ModelName][MethodName] & string> // Is the return type a scalar?
    >
}

type NexusPrismaMethod<
  ModelName extends keyof NexusPrismaTypes,
  MethodName extends keyof NexusPrismaTypes[ModelName] & string,
  ThisKind extends Kind,
  ReturnType extends string = NexusPrismaTypes[ModelName][MethodName] & string
> =
  ThisKind extends AKind<'Enum'>
  ? () => NexusPrismaFields<ModelName>
  // else if
  // if scalar return scalar opts
  : ThisKind extends AKind<'Scalar'>
  ? <Alias extends string | undefined = undefined>(opts?: NexusPrismaScalarOpts<ModelName, MethodName, Alias>) => NexusPrismaFields<ModelName>
  // else if
  // if model name has a mapped graphql types then make opts optional
  : IsModelNameExistsInGraphQLTypes<ReturnType> extends true
  ? <Alias extends string | undefined = undefined>(opts?: NexusPrismaRelationOpts<ModelName, MethodName, Alias, ReturnType>) => NexusPrismaFields<ModelName>
  // else
  // force use input the related graphql type -> { type: '...' }
  : <Alias extends string | undefined = undefined>(opts: NexusPrismaRelationOpts<ModelName, MethodName, Alias, ReturnType>) => NexusPrismaFields<ModelName>

type GetNexusPrismaMethod<TypeName extends string> = TypeName extends keyof NexusPrismaMethods
  ? NexusPrismaMethods[TypeName]
  : <CustomTypeName extends keyof ModelTypes>(typeName: CustomTypeName) => NexusPrismaMethods[CustomTypeName]

type GetNexusPrisma<TypeName extends string, ModelOrCrud extends 'model' | 'crud'> =
  ModelOrCrud extends 'model'
    ? TypeName extends 'Mutation'
      ? never
      : TypeName extends 'Query'
        ? never
        : GetNexusPrismaMethod<TypeName>
    : ModelOrCrud extends 'crud'
      ? TypeName extends 'Mutation'
        ? GetNexusPrismaMethod<TypeName>
        : TypeName extends 'Query'
          ? GetNexusPrismaMethod<TypeName>
          : never
      : never

// Generated
interface ModelTypes {
  UserRole: prisma.UserRole
  UserSocialMedia: prisma.UserSocialMedia
  User: prisma.User
  SomePublicRecordWithIntId: prisma.SomePublicRecordWithIntId
}
  
interface NexusPrismaInputs {
  Query: {
    userRoles: {
  filtering: 'id' | 'name' | 'users' | 'AND' | 'OR' | 'NOT'
  ordering: 'id' | 'name'
}
    userSocialMedias: {
  filtering: 'id' | 'instagram' | 'twitter' | 'userId' | 'AND' | 'OR' | 'NOT' | 'user'
  ordering: 'id' | 'instagram' | 'twitter' | 'userId'
}
    users: {
  filtering: 'id' | 'email' | 'roles' | 'firstName' | 'lastName' | 'gender' | 'yearOfBirth' | 'wantsNewsletter' | 'AND' | 'OR' | 'NOT' | 'userSocialMedia'
  ordering: 'id' | 'email' | 'firstName' | 'lastName' | 'gender' | 'yearOfBirth' | 'wantsNewsletter'
}
    somePublicRecordWithIntIds: {
  filtering: 'id' | 'title' | 'AND' | 'OR' | 'NOT'
  ordering: 'id' | 'title'
}

  },
    UserRole: {
    users: {
  filtering: 'id' | 'email' | 'roles' | 'firstName' | 'lastName' | 'gender' | 'yearOfBirth' | 'wantsNewsletter' | 'AND' | 'OR' | 'NOT' | 'userSocialMedia'
  ordering: 'id' | 'email' | 'firstName' | 'lastName' | 'gender' | 'yearOfBirth' | 'wantsNewsletter'
}

  },  UserSocialMedia: {


  },  User: {
    roles: {
  filtering: 'id' | 'name' | 'users' | 'AND' | 'OR' | 'NOT'
  ordering: 'id' | 'name'
}

  },  SomePublicRecordWithIntId: {


  }
}

interface NexusPrismaTypes {
  Query: {
    userRole: 'UserRole'
    userRoles: 'UserRole'
    userSocialMedia: 'UserSocialMedia'
    userSocialMedias: 'UserSocialMedia'
    user: 'User'
    users: 'User'
    somePublicRecordWithIntId: 'SomePublicRecordWithIntId'
    somePublicRecordWithIntIds: 'SomePublicRecordWithIntId'

  },
  Mutation: {
    createOneUserRole: 'UserRole'
    updateOneUserRole: 'UserRole'
    updateManyUserRole: 'BatchPayload'
    deleteOneUserRole: 'UserRole'
    deleteManyUserRole: 'BatchPayload'
    upsertOneUserRole: 'UserRole'
    createOneUserSocialMedia: 'UserSocialMedia'
    updateOneUserSocialMedia: 'UserSocialMedia'
    updateManyUserSocialMedia: 'BatchPayload'
    deleteOneUserSocialMedia: 'UserSocialMedia'
    deleteManyUserSocialMedia: 'BatchPayload'
    upsertOneUserSocialMedia: 'UserSocialMedia'
    createOneUser: 'User'
    updateOneUser: 'User'
    updateManyUser: 'BatchPayload'
    deleteOneUser: 'User'
    deleteManyUser: 'BatchPayload'
    upsertOneUser: 'User'
    createOneSomePublicRecordWithIntId: 'SomePublicRecordWithIntId'
    updateOneSomePublicRecordWithIntId: 'SomePublicRecordWithIntId'
    updateManySomePublicRecordWithIntId: 'BatchPayload'
    deleteOneSomePublicRecordWithIntId: 'SomePublicRecordWithIntId'
    deleteManySomePublicRecordWithIntId: 'BatchPayload'
    upsertOneSomePublicRecordWithIntId: 'SomePublicRecordWithIntId'

  },
  UserRole: {
    id: 'String'
    name: 'String'
    users: 'User'

},  UserSocialMedia: {
    id: 'String'
    instagram: 'String'
    twitter: 'String'
    user: 'User'
    userId: 'String'

},  User: {
    id: 'String'
    email: 'String'
    roles: 'UserRole'
    firstName: 'String'
    lastName: 'String'
    gender: 'Gender'
    yearOfBirth: 'Int'
    wantsNewsletter: 'Boolean'
    userSocialMedia: 'UserSocialMedia'

},  SomePublicRecordWithIntId: {
    id: 'Int'
    title: 'String'

}
}

interface NexusPrismaMethods {
  UserRole: NexusPrismaFields<'UserRole'>
  UserSocialMedia: NexusPrismaFields<'UserSocialMedia'>
  User: NexusPrismaFields<'User'>
  SomePublicRecordWithIntId: NexusPrismaFields<'SomePublicRecordWithIntId'>
  Query: NexusPrismaFields<'Query'>
  Mutation: NexusPrismaFields<'Mutation'>
}
  

declare global {
  type NexusPrisma<
    TypeName extends string,
    ModelOrCrud extends 'model' | 'crud'
  > = GetNexusPrisma<TypeName, ModelOrCrud>;
}
  