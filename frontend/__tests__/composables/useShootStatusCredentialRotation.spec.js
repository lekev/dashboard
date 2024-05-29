//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'

import {
  rotationTypes,
  useShootStatusCredentialRotation,
} from '@/composables/useShootStatusCredentialRotation'

import {
  set,
  unset,
  find,
} from '@/lodash'

describe('composables', () => {
  describe('useShootStatusCredentialRotation', () => {
    const shootItem = ref(null)

    const Component = {
      setup () {
        return {
          ...useShootStatusCredentialRotation(shootItem),
        }
      },
      render () { },
    }

    describe('#shootStatusCredentialsRotationAggregatedPhase', () => {
      beforeEach(async () => {
        shootItem.value = {
          spec: {
            kubernetes: {
              enableStaticTokenKubeconfig: true,
            },
          },
          status: {
            credentials: {
              rotation: {
                certificateAuthorities: {
                  phase: 'Prepared',
                },
                etcdEncryptionKey: {
                  phase: 'Completing',
                },
                serviceAccountKey: {
                  phase: 'Completed',
                },
              },
            },
          },
        }
      })

      it('should return progressing phase', () => {
        const wrapper = shallowMount(Component)
        expect(wrapper.vm.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Completing',
          caption: 'Completing',
        })
      })

      it('should return completed phase', () => {
        set(shootItem.value, 'status.credentials.rotation.certificateAuthorities.phase', 'Completed')
        set(shootItem.value, 'status.credentials.rotation.etcdEncryptionKey.phase', 'Completed')
        const wrapper = shallowMount(Component)
        expect(wrapper.vm.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Completed',
          caption: 'Completed',
        })
      })

      it('should return prepared phase', () => {
        set(shootItem.value, 'status.credentials.rotation.etcdEncryptionKey.phase', 'Prepared')
        set(shootItem.value, 'status.credentials.rotation.serviceAccountKey.phase', 'Prepared')
        const wrapper = shallowMount(Component)
        expect(wrapper.vm.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Prepared',
          caption: 'Prepared',
        })
      })

      it('should return incomplete prepared phase', () => {
      // treat unrotated credentials as unprepared
        unset(shootItem.value, 'status.credentials.rotation.etcdEncryptionKey')

        const wrapper = shallowMount(Component)
        expect(wrapper.vm.shootCredentialsRotationAggregatedPhase).toEqual({
          type: 'Prepared',
          caption: 'Prepared 1/3',
          incomplete: true,
          unpreparedRotations: [
            find(rotationTypes, ['type', 'etcdEncryptionKey']),
            find(rotationTypes, ['type', 'serviceAccountKey']),
          ],
        })
      })
    })
  })
})
