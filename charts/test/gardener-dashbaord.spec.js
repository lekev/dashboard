#!/usr/bin/env node
//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const yaml = require('js-yaml')
const { merge, chain } = require('lodash')

function writeValues(filename, values = {}) {
  const ca = '-----BEGIN RSA PRIVATE KEY-----\nLi4u\n-----END RSA PRIVATE KEY-----'
  const defaultValues = {
    image: {
      tag: '1.26.0-dev-4d529c1'
    },
    apiServerUrl: 'https://api.garden.example.org',
    apiServerCa: ca,
    hosts: [
      'gardener.ingress.garden.example.org'
    ],
    ingress: {
      annotations: {
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'nginx.ingress.kubernetes.io/use-port-in-redirects': 'true',
        'kubernetes.io/ingress.class': 'nginx'
      }
    },
    sessionSecret: 'sessionSecret',
    secret: 'secret',
    oidc: {
      issuerUrl: 'https://identity.garden.example.org',
      clientId: 'dashboard',
      clientSecret: 'dashboardSecret',
      ca,
      public: {
        clientId: 'kube-kubectl',
        clientSecret: 'kubeKubectlSecret'
      }
    },
    frontendConfig: {
      landingPageUrl: 'https://gardener.cloud/',
      helpMenuItems: [
        {
          title: 'Getting Started',
          icon: 'description',
          url: 'https://gardener.cloud/about/'
        },
        {
          title: 'slack',
          icon: 'mdi-slack',
          url: 'https://kubernetes.slack.com/messages/gardener'
        },
        {
          title: 'Issues',
          icon: 'mdi-bug',
          url: 'https://github.com/gardener/dashboard/issues/'
        }
      ],
      externalTools: [
        {
          title: 'Applications and Services Hub',
          icon: 'apps',
          url: 'https://apps.garden.example.org/foo/bar{?namespace,name}'
        }
      ],
      gitHubRepoUrl: 'https://github.com/gardener/journals'
    },
    gitHub: {
      apiUrl: 'https://github.com/api/v3/',
      org: 'gardener',
      repository: 'journals',
      webhookSecret: 'webhookSecret',
      authentication: {
        token: 'webhookAuthenticationToken'
      }
    }
  }
  values = merge(defaultValues, values)
  fs.writeFileSync(filename, yaml.safeDump(values))
  return values
}

function decodeBase64(data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

describe('gardener-dashboard', function () {
  const template = 'gardener-dashboard'
  let dirname
  let filename

  before(function () {
    dirname = fs.mkdtempSync(path.join(os.tmpdir(), 'helm-'))
  })

  beforeEach(function () {
    const randomNumber = crypto.randomBytes(4).readUInt32LE(0)
    filename = path.join(dirname, `values-${randomNumber}.yaml`)
  })

  after(function () {
    fs.rmdirSync(dirname, {
      maxRetries: 100,
      recursive: true
    })
  })

  afterEach(function () {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename)
    }
  })

  describe('templates', function () {
    describe('configmap', function () {
      const name = 'gardener-dashboard-configmap'

      it('should render the template', async function () {
        const values = writeValues(filename, {})
        const documents = await helmTemplate(template, filename)
        const config = chain(documents)
          .find(['metadata.name', name])
          .get('data["config.yaml"]')
          .thru(yaml.safeLoad)
          .value()
        const {
          apiServerUrl,
          apiServerCaData,
          oidc
        } = config
        expect(apiServerUrl).to.equal(values.apiServerUrl)
        expect(decodeBase64(apiServerCaData)).to.equal(values.apiServerCa)
        expect(oidc.issuer).to.equal(values.oidc.issuerUrl)
        expect(oidc.public.clientId).to.equal(values.oidc.public.clientId)
        expect(oidc.public.clientSecret).to.equal(values.oidc.public.clientSecret)
      })
    })
  })
})
