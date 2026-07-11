/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/catch_the_magician.json`.
 */
export type CatchTheMagician = {
  "address": "74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR",
  "metadata": {
    "name": "catchTheMagician",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Catch the Magician ranked-run account foundation"
  },
  "instructions": [
    {
      "name": "finishRun",
      "discriminator": [
        125,
        146,
        243,
        213,
        56,
        220,
        214,
        25
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          },
          "relations": [
            "runSession"
          ]
        },
        {
          "name": "runSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "run_session.run_id",
                "account": "runSession"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "playerProfile"
          ]
        }
      ],
      "args": [
        {
          "name": "finalScore",
          "type": "u64"
        },
        {
          "name": "finalDistance",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePlayer",
      "discriminator": [
        79,
        249,
        88,
        177,
        220,
        62,
        56,
        128
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "startRun",
      "discriminator": [
        72,
        212,
        1,
        91,
        61,
        186,
        2,
        52
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "runSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "runId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "playerProfile"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "runId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "playerProfile",
      "discriminator": [
        82,
        226,
        99,
        87,
        164,
        130,
        181,
        80
      ]
    },
    {
      "name": "runSession",
      "discriminator": [
        112,
        45,
        137,
        134,
        225,
        63,
        28,
        131
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "runNotActive",
      "msg": "This run is not active."
    },
    {
      "code": 6001,
      "name": "invalidRunAuthority",
      "msg": "The run authority does not match the connected wallet."
    },
    {
      "code": 6002,
      "name": "invalidPlayerProfile",
      "msg": "The run belongs to a different player profile."
    },
    {
      "code": 6003,
      "name": "arithmeticOverflow",
      "msg": "A profile counter exceeded its supported range."
    }
  ],
  "types": [
    {
      "name": "playerProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "runsPlayed",
            "type": "u64"
          },
          {
            "name": "bestScore",
            "type": "u64"
          },
          {
            "name": "bestDistance",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "runSession",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "playerProfile",
            "type": "pubkey"
          },
          {
            "name": "runId",
            "type": "u64"
          },
          {
            "name": "startedAt",
            "type": "i64"
          },
          {
            "name": "finishedAt",
            "type": "i64"
          },
          {
            "name": "finalScore",
            "type": "u64"
          },
          {
            "name": "finalDistance",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "runStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "runStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "finished"
          }
        ]
      }
    }
  ]
};
