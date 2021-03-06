import { TypeKind } from "graphql";
import {
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  DELETE,
} from "react-admin";
import getResponseParser from "./getResponseParser";
import { Resource, IntrospectionResult } from "./constants/interfaces";

import { getTestIntrospection } from "./testUtils/getTestIntrospection";

const testListTypes = (type: string) => {
  it(`returns the response expected by RA for ${type}`, async () => {
    const testIntrospection: IntrospectionResult = await getTestIntrospection();
    const testUserResource: Resource = testIntrospection.resources.find(
      (r) => r.type.kind === "OBJECT" && r.type.name === "User",
    );

    const response = {
      data: {
        items: [
          {
            id: "user1",
            firstName: "firstName1",
            roles: [
              {
                id: "admin",
              },
            ],
          },
          {
            id: "post2",
            firstName: "firstName2",
            roles: [
              {
                id: "admin",
              },
            ],
          },
        ],
        total: 100,
      },
    };

    expect(
      getResponseParser(testIntrospection)(type, testUserResource)(response),
    ).toEqual({
      data: [
        {
          id: "user1",
          firstName: "firstName1",
          roles: ["admin"],
        },
        {
          id: "post2",
          firstName: "firstName2",
          roles: ["admin"],
        },
      ],
      total: 100,
    });
  });
};

const testSingleTypes = (type: string) => {
  it(`returns the response expected by RA for ${type}`, async () => {
    const testIntrospection: IntrospectionResult = await getTestIntrospection();
    const testUserResource: Resource = testIntrospection.resources.find(
      (r) => r.type.kind === "OBJECT" && r.type.name === "User",
    );
    const response = {
      data: {
        data: {
          id: "user1",
          firstName: "firstName1",
          roles: [
            {
              id: "admin",
            },
          ],
        },
      },
    };
    expect(
      getResponseParser(testIntrospection)(type, testUserResource)(response),
    ).toEqual({
      data: {
        id: "user1",
        firstName: "firstName1",
        roles: ["admin"],
      },
    });
  });
};

describe("getResponseParser", () => {
  testListTypes(GET_LIST);
  testListTypes(GET_MANY);
  testListTypes(GET_MANY_REFERENCE);
  testSingleTypes(CREATE);
  testSingleTypes(UPDATE);
  testSingleTypes(DELETE);
});
