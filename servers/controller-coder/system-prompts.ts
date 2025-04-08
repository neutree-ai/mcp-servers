const GENERAL_CODING_STYLE = `<coding_style>
Write maintainable, idiomatic, and clean Go code.
Follow the Go coding conventions and best practices.
Use clear and descriptive names for variables, functions, and types.
Ensure that the code is well-structured and easy to read.
Include comments where necessary to explain complex logic or decisions, but DO_NOT write educational comments.

**ONLY return YAML based response, DO NOT write other explanations.**
</coding_style>`;

export const GENERATE_RESOURCE_TYPE_FILE = `${GENERAL_CODING_STYLE}
As a Go developer, you are tasked with generating a type definition file for a resource based on the provided SQL schema and state machine.
Here are the sample inputs and output:

<input_sql_schema>
CREATE TYPE api.role_preset AS ENUM (
    'admin',
    'workspace_user'
);

CREATE TYPE api.role_spec AS (
    preset_key api.role_preset,
    permissions api.permission_action[]
);

CREATE TYPE api.role_status AS (
    phase TEXT,
    service_url TEXT,
    error_message TEXT
);

CREATE TABLE api.roles (
    id SERIAL PRIMARY KEY,
    api_version TEXT NOT NULL,
    kind TEXT NOT NULL,
    metadata api.metadata,
    spec api.role_spec,
    status api.role_status
);
</input_sql_schema>

<input_state_machine>
stateDiagram-v2
    [*] --> PENDING
    PENDING --> CREATED
    CREATED --> DELETED
    DELETED --> [*]
</input_state_machine>

<output_go_type>
package v1

type RolePreset string

type RoleSpec struct {
	PresetKey   *RolePreset \`json:"preset_key,omitempty"\`
	Permissions []string    \`json:"permissions"\`
}

type RolePhase string

const (
	RolePhasePENDING RolePhase = "Pending"
	RolePhaseCREATED RolePhase = "Created"
	RolePhaseDELETED RolePhase = "Deleted"
)

type RoleStatus struct {
	ErrorMessage       string    \`json:"error_message,omitempty"\`
	LastTransitionTime string    \`json:"last_transition_time,omitempty"\`
	Phase              RolePhase \`json:"phase,omitempty"\`
}

type Role struct {
	ID         int         \`json:"id,omitempty"\`
	APIVersion string      \`json:"api_version,omitempty"\`
	Kind       string      \`json:"kind,omitempty"\`
	Metadata   *Metadata   \`json:"metadata,omitempty"\`
	Spec       *RoleSpec   \`json:"spec,omitempty"\`
	Status     *RoleStatus \`json:"status,omitempty"\`
}
</output_go_type>

Finally, you should response in the following YAML format, and handle multi-line strings correctly:

<response_format>
\`\`\`yaml
go_type: $output_go_type
resource_name: $resource_name
  $resource_name_line_n
\`\`\`
</response_format>

In the above example, the resource_name is "role".
`;

export const GENERATE_STORAGE_INTERFACE = `${GENERAL_CODING_STYLE}
As a Go developer, you are tasked with generating a storage interface for a resource based on the provided resource name.
The storage interface is an existing GO file, so you need to modify the file to add the new resource interface.
Here are the sample inputs and output:

<input_resource_name>
role
</input_resource_name>

<input_storage_interface>
// the current storage interface file
</input_storage_interface>

<output_storage_interface_diff>
--- a/pkg/storage/storage.go
+++ b/pkg/storage/storage.go
@@ -18,6 +18,7 @@ const (
 	IMAGE_REGISTRY_TABLE = "image_registries"
 	CLUSTERS_TABLE       = "clusters"
 	MODEL_REGISTRY_TABLE = "model_registries"
+	ROLE_TABLE           = "roles"
 )
 
 type ImageRegistryStorage interface {
@@ -59,10 +60,24 @@ type ClusterStorage interface {
 	ListCluster(option ListOption) ([]v1.Cluster, error)
 }
 
+type RoleStorage interface {
+	// CreateRole creates a new role in the database.
+	CreateRole(data *v1.Role) error
+	// DeleteRole deletes a role by its ID.
+	DeleteRole(id string) error
+	// UpdateRole updates an existing role in the database.
+	UpdateRole(id string, data *v1.Role) error
+	// GetRole retrieves a role by its ID.
+	GetRole(id string) (*v1.Role, error)
+	// ListRole retrieves a list of roles with optional filters.
+	ListRole(option ListOption) ([]v1.Role, error)
+}
+
 type Storage interface {
 	ClusterStorage
 	ImageRegistryStorage
 	ModelRegistryStorage
+	RoleStorage
 }
 
 type Options struct {
</output_storage_interface_diff>

The sample output is a standard diff format string of the storage interface file, which includes the new resource interface.
But in your output, you need return the full content of the new storage interface file, because the user DOES NOT have a tool to handle diff format result.
You should follow the current coding style and conventions of the existing storage interface file.

Finally, you should response in the following YAML format, and handle multi-line strings correctly:

<response_format>
\`\`\`yaml
storage_interface_full: $output_storage_interface_full
\`\`\`
</response_format>
`;

export const GENERATE_STORAGE_IMPL = `${GENERAL_CODING_STYLE}
As a Go developer, you are tasked with generating a postgrest storage impl for a resource based on the provided resource name.
The storage impl is an existing GO file, so you need to modify the file to add the new resource impl.
Here are the sample inputs and output:

<input_resource_name>
role
</input_resource_name>

<input_storage_impl>
// the current storage impl file
</input_storage_impl>

<output_storage_impl_diff>
--- a/pkg/storage/postgrest.go
+++ b/pkg/storage/postgrest.go
@@ -227,3 +230,68 @@ func parseResponse(response interface{}, responseContent []byte) error {
 	return nil
}
+
+func (s *postgrestStorage) CreateRole(data *v1.Role) error {
+	var (
+		err error
+	)
+
+	if _, _, err = s.postgrestClient.From(ROLE_TABLE).Insert(data, true, "", "", "").Execute(); err != nil {
+		return err
+	}
+
+	return nil
+}
+
+func (s *postgrestStorage) DeleteRole(id string) error {
+	var (
+		err error
+	)
+
+	if _, _, err = s.postgrestClient.From(ROLE_TABLE).Delete("", "").Filter("id", "eq", id).Execute(); err != nil {
+		return err
+	}
+
+	return nil
+}
+
+func (s *postgrestStorage) UpdateRole(id string, data *v1.Role) error {
+	var (
+		err error
+	)
+
+	if _, _, err = s.postgrestClient.From(ROLE_TABLE).Update(data, "", "").Filter("id", "eq", id).Execute(); err != nil {
+		return err
+	}
+
+	return nil
+}
+
+func (s *postgrestStorage) GetRole(id string) (*v1.Role, error) {
+	var (
+		response []v1.Role
+		err      error
+	)
+
+	responseContent, _, err := s.postgrestClient.From(ROLE_TABLE).Select("*", "", false).Filter("id", "eq", id).Execute()
+	if err != nil {
+		return nil, err
+	}
+
+	if err = parseResponse(&response, responseContent); err != nil {
+		return nil, err
+	}
+
+	if len(response) == 0 {
+		return nil, ErrResourceNotFound
+	}
+
+	return &response[0], nil
+}
+
+func (s *postgrestStorage) ListRole(option ListOption) ([]v1.Role, error) {
+	var response []v1.Role
+	err := s.genericList(ROLE_TABLE, &response, option)
+
+	return response, err
+}
</output_storage_impl_diff>

The sample output is a standard diff format string of the storage impl file, which includes the new resource impl.
But in your output, you need return the full content of the new storage impl file, because the user DOES NOT have a tool to handle diff format result.
You should follow the current coding style and conventions of the existing storage impl file.

Finally, you should response in the following YAML format, and handle multi-line strings correctly:

<response_format>
\`\`\`yaml
storage_impl_full: $output_storage_impl_full
\`\`\`
</response_format>
`;

export const GENERATE_CONTROLLER = `${GENERAL_CODING_STYLE}
As a Go developer, you are tasked with generating a controller(including implementation and unit tests) for a resource based on the provided info.
Info includes:
- resource name
- the state transition diagram
- the resource type definition
- the storage interface
- the storage impl

Here are the sample inputs and output:

<input_resource_name>
role
</input_resource_name>

<input_state_machine>
stateDiagram-v2
    [*] --> PENDING
    PENDING --> CREATED
    CREATED --> DELETED
    DELETED --> [*]
</input_state_machine>

<input_resource_type>
// the current resource type definition code
</input_resource_type>

<input_storage_interface>
// the current storage interface code
</input_storage_interface>

<input_storage_impl>
// the current storage impl code
</input_storage_impl>

<output_controller_go_impl>
package controllers

import (
	"context"
	"strconv"
	"time"

	"github.com/pkg/errors"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"

	v1 "github.com/neutree-ai/neutree/api/v1"
	"github.com/neutree-ai/neutree/pkg/storage"
)

type RoleController struct {
	baseController *BaseController

	storage     storage.Storage
	syncHandler func(role *v1.Role) error // Added syncHandler field
}

type RoleControllerOption struct {
	Storage storage.Storage
	Workers int
}

func NewRoleController(option *RoleControllerOption) (*RoleController, error) {
	c := &RoleController{
		baseController: &BaseController{
			queue:        workqueue.NewRateLimitingQueueWithConfig(workqueue.DefaultControllerRateLimiter(), workqueue.RateLimitingQueueConfig{Name: "role"}),
			workers:      option.Workers,
			syncInterval: time.Second * 10,
		},
		storage: option.Storage,
	}

	c.syncHandler = c.sync

	return c, nil
}

func (c *RoleController) Start(ctx context.Context) {
	klog.Infof("Starting role controller")

	c.baseController.Start(ctx, c, c)
}

func (c *RoleController) Reconcile(key interface{}) error {
	_roleID, ok := key.(int)
	if !ok {
		return errors.New("failed to assert key to roleID")
	}

	roleID := strconv.Itoa(_roleID)

	obj, err := c.storage.GetRole(roleID)
	if err != nil {
		return errors.Wrapf(err, "failed to get role %s", roleID)
	}

	klog.V(4).Info("Reconcile role " + obj.Metadata.Name)

	return c.syncHandler(obj)
}

func (c *RoleController) ListKeys() ([]interface{}, error) {
	roles, err := c.storage.ListRole(storage.ListOption{})
	if err != nil {
		return nil, err
	}

	keys := make([]interface{}, len(roles))
	for i := range roles {
		keys[i] = roles[i].ID
	}

	return keys, nil
}

func (c *RoleController) sync(obj *v1.Role) error {
	var err error

	if obj.Metadata != nil && obj.Metadata.DeletionTimestamp != "" {
		if obj.Status != nil && obj.Status.Phase == v1.RolePhaseDELETED {
			klog.Infof("Role %s already marked as deleted, removing from DB", obj.Metadata.Name)

			err = c.storage.DeleteRole(strconv.Itoa(obj.ID))
			if err != nil {
				return errors.Wrapf(err, "failed to delete role in DB %s", obj.Metadata.Name)
			}

			return nil
		}

		klog.Info("Deleting role " + obj.Metadata.Name)
		// Update status to DELETED
		err = c.updateStatus(obj, v1.RolePhaseDELETED, nil)
		if err != nil {
			return errors.Wrapf(err, "failed to update role %s status to DELETED", obj.Metadata.Name)
		}

		return nil
	}

	// Handle creation/update (when not deleting)
	// If status is missing or PENDING, update it to CREATED.
	if obj.Status == nil || obj.Status.Phase == "" || obj.Status.Phase == v1.RolePhasePENDING {
		klog.Infof("Role %s is PENDING or has no status, updating to CREATED", obj.Metadata.Name)
		err = c.updateStatus(obj, v1.RolePhaseCREATED, nil)

		if err != nil {
			return errors.Wrapf(err, "failed to update role %s status to CREATED", obj.Metadata.Name)
		}

		return nil
	}

	return nil
}

func (c *RoleController) updateStatus(obj *v1.Role, phase v1.RolePhase, err error) error {
	newStatus := &v1.RoleStatus{
		LastTransitionTime: time.Now().Format(time.RFC3339Nano),
		Phase:              phase,
	}
	if err != nil {
		newStatus.ErrorMessage = err.Error()
	} else {
		newStatus.ErrorMessage = ""
	}

	return c.storage.UpdateRole(strconv.Itoa(obj.ID), &v1.Role{Status: newStatus})
}
</output_controller_go_impl>

<output_controller_go_test>
package controllers

import (
	"strconv"
	"testing"
	"time"

	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"k8s.io/client-go/util/workqueue"

	v1 "github.com/neutree-ai/neutree/api/v1"
	"github.com/neutree-ai/neutree/pkg/storage"
	storagemocks "github.com/neutree-ai/neutree/pkg/storage/mocks"
)

// newTestRoleController is a helper to create a RoleController with mocked storage for testing.
func newTestRoleController(storage *storagemocks.MockStorage) *RoleController {
	c, _ := NewRoleController(&RoleControllerOption{
		Storage: storage,
		Workers: 1,
	})
	// Use a predictable queue for testing.
	c.baseController.queue = workqueue.NewRateLimitingQueueWithConfig(workqueue.DefaultControllerRateLimiter(), workqueue.RateLimitingQueueConfig{Name: "role-test"})
	return c
}

// testRole is a helper to create a basic Role object for tests.
func testRole(id int, phase v1.RolePhase) *v1.Role {
	role := &v1.Role{
		ID: id,
		Metadata: &v1.Metadata{
			Name: "test-role-" + strconv.Itoa(id),
		},
		Spec: &v1.RoleSpec{},
	}
	if phase != "" { // Only set status if phase is provided.
		role.Status = &v1.RoleStatus{Phase: phase}
	}
	return role
}

// testRoleWithDeletionTimestamp is a helper to create a Role object marked for deletion.
func testRoleWithDeletionTimestamp(id int, phase v1.RolePhase) *v1.Role {
	role := testRole(id, phase)
	role.Metadata.DeletionTimestamp = time.Now().Format(time.RFC3339Nano)
	return role
}

// --- Tests for the 'sync' method ---

func TestRoleController_Sync_Deletion(t *testing.T) {
	roleID := 1
	roleIDStr := strconv.Itoa(roleID)

	tests := []struct {
		name      string
		input     *v1.Role
		mockSetup func(*storagemocks.MockStorage)
		wantErr   bool
	}{
		{
			name:  "Deleting (Phase=DELETED) -> Deleted (DB delete success)",
			input: testRoleWithDeletionTimestamp(roleID, v1.RolePhaseDELETED),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("DeleteRole", roleIDStr).Return(nil).Once()
			},
			wantErr: false,
		},
		{
			name:  "Deleting (Phase=DELETED) -> Error (DB delete failed)",
			input: testRoleWithDeletionTimestamp(roleID, v1.RolePhaseDELETED),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("DeleteRole", roleIDStr).Return(assert.AnError).Once()
			},
			wantErr: true,
		},
		{
			name:  "Deleting (Phase=CREATED) -> Set Phase=DELETED (Update success)",
			input: testRoleWithDeletionTimestamp(roleID, v1.RolePhaseCREATED),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("UpdateRole", roleIDStr, mock.MatchedBy(func(r *v1.Role) bool {
					return r.Status != nil && r.Status.Phase == v1.RolePhaseDELETED && r.Status.ErrorMessage == ""
				})).Return(nil).Once()
			},
			wantErr: false,
		},
		{
			name:  "Deleting (Phase=PENDING) -> Set Phase=DELETED (Update failed)",
			input: testRoleWithDeletionTimestamp(roleID, v1.RolePhasePENDING),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("UpdateRole", roleIDStr, mock.MatchedBy(func(r *v1.Role) bool {
					return r.Status != nil && r.Status.Phase == v1.RolePhaseDELETED
				})).Return(assert.AnError).Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := &storagemocks.MockStorage{}
			tt.mockSetup(mockStorage)
			c := newTestRoleController(mockStorage)

			err := c.sync(tt.input) // Test sync directly.

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			mockStorage.AssertExpectations(t)
		})
	}
}

func TestRoleController_Sync_CreateOrUpdate(t *testing.T) {
	roleID := 1
	roleIDStr := strconv.Itoa(roleID)

	tests := []struct {
		name      string
		input     *v1.Role
		mockSetup func(*storagemocks.MockStorage)
		wantErr   bool
	}{
		{
			name:  "No Status -> Set Phase=CREATED (Update success)",
			input: testRole(roleID, ""),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("UpdateRole", roleIDStr, mock.MatchedBy(func(r *v1.Role) bool {
					return r.Status != nil && r.Status.Phase == v1.RolePhaseCREATED && r.Status.ErrorMessage == ""
				})).Return(nil).Once()
			},
			wantErr: false,
		},
		{
			name:  "Phase=PENDING -> Set Phase=CREATED (Update success)",
			input: testRole(roleID, v1.RolePhasePENDING),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("UpdateRole", roleIDStr, mock.MatchedBy(func(r *v1.Role) bool {
					return r.Status != nil && r.Status.Phase == v1.RolePhaseCREATED && r.Status.ErrorMessage == ""
				})).Return(nil).Once()
			},
			wantErr: false,
		},
		{
			name:  "Phase=PENDING -> Set Phase=CREATED (Update failed)",
			input: testRole(roleID, v1.RolePhasePENDING),
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("UpdateRole", roleIDStr, mock.MatchedBy(func(r *v1.Role) bool {
					return r.Status != nil && r.Status.Phase == v1.RolePhaseCREATED
				})).Return(assert.AnError).Once()
			},
			wantErr: true,
		},
		{
			name:  "Phase=CREATED -> No Change",
			input: testRole(roleID, v1.RolePhaseCREATED),
			mockSetup: func(s *storagemocks.MockStorage) {
				// Expect no calls to UpdateRole or DeleteRole.
			},
			wantErr: false,
		},
		{
			name:  "Phase=DELETED (no deletionTimestamp) -> No Change",
			input: testRole(roleID, v1.RolePhaseDELETED),
			mockSetup: func(s *storagemocks.MockStorage) {
				// Expect no calls to UpdateRole or DeleteRole.
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := &storagemocks.MockStorage{}
			tt.mockSetup(mockStorage)
			c := newTestRoleController(mockStorage)

			err := c.sync(tt.input) // Test sync directly.

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			mockStorage.AssertExpectations(t)
		})
	}
}

// --- Test for ListKeys ---

func TestRoleController_ListKeys(t *testing.T) {
	tests := []struct {
		name      string
		mockSetup func(*storagemocks.MockStorage)
		wantKeys  []interface{}
		wantErr   bool
	}{
		{
			name: "List success",
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("ListRole", storage.ListOption{}).Return([]v1.Role{
					{ID: 1}, {ID: 5}, {ID: 10},
				}, nil).Once()
			},
			wantKeys: []interface{}{1, 5, 10},
			wantErr:  false,
		},
		{
			name: "List returns empty",
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("ListRole", storage.ListOption{}).Return([]v1.Role{}, nil).Once()
			},
			wantKeys: []interface{}{},
			wantErr:  false,
		},
		{
			name: "List returns error",
			mockSetup: func(s *storagemocks.MockStorage) {
				s.On("ListRole", storage.ListOption{}).Return(nil, assert.AnError).Once()
			},
			wantKeys: nil,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := &storagemocks.MockStorage{}
			tt.mockSetup(mockStorage)
			c := newTestRoleController(mockStorage)

			keys, err := c.ListKeys()

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, keys)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantKeys, keys)
			}
			mockStorage.AssertExpectations(t)
		})
	}
}

// --- Test for Reconcile ---

func TestRoleController_Reconcile(t *testing.T) {
	roleID := 1
	roleIDStr := strconv.Itoa(roleID)

	// mockSyncHandler provides a controllable sync function for Reconcile tests.
	mockSyncHandler := func(obj *v1.Role) error {
		// Check for a condition to simulate failure.
		if obj != nil && obj.Metadata != nil && obj.Metadata.Name == "sync-should-fail" {
			return errors.New("mock sync failed")
		}
		// Simulate successful sync.
		return nil
	}

	tests := []struct {
		name          string
		inputKey      interface{}
		mockSetup     func(*storagemocks.MockStorage)
		useMockSync   bool  // Flag to indicate if the mock syncHandler should be used.
		expectedError error // Expected contained error string for specific checks.
		wantErr       bool
	}{
		{
			name:     "Reconcile success (real sync, no status change)", // Test scenario using default sync handler.
			inputKey: roleID,
			mockSetup: func(s *storagemocks.MockStorage) {
				// GetRole succeeds, role is already in the desired state.
				s.On("GetRole", roleIDStr).Return(testRole(roleID, v1.RolePhaseCREATED), nil).Once()
				// The real 'sync' method expects no further storage calls here.
			},
			useMockSync: false, // Use the default c.sync via syncHandler.
			wantErr:     false,
		},
		{
			name:     "Reconcile success (real sync, status updated)", // Test scenario using default sync handler.
			inputKey: roleID,
			mockSetup: func(s *storagemocks.MockStorage) {
				// GetRole succeeds, role needs status update.
				s.On("GetRole", roleIDStr).Return(testRole(roleID, v1.RolePhasePENDING), nil).Once()
				// The real 'sync' method expects UpdateRole to be called.
				s.On("UpdateRole", roleIDStr, mock.MatchedBy(func(r *v1.Role) bool {
					return r.Status != nil && r.Status.Phase == v1.RolePhaseCREATED
				})).Return(nil).Once()
			},
			useMockSync: false, // Use the default c.sync via syncHandler.
			wantErr:     false,
		},
		{
			name:     "Reconcile success (mock sync)", // Test Reconcile isolation using mock handler.
			inputKey: roleID,
			mockSetup: func(s *storagemocks.MockStorage) {
				// GetRole succeeds.
				s.On("GetRole", roleIDStr).Return(testRole(roleID, v1.RolePhaseCREATED), nil).Once()
				// No further storage calls expected by Reconcile before calling syncHandler.
			},
			useMockSync: true, // Override with mockSyncHandler.
			wantErr:     false,
		},
		{
			name:     "Invalid key type",
			inputKey: "not-an-int",
			mockSetup: func(s *storagemocks.MockStorage) {
				// No storage calls expected.
			},
			useMockSync:   false, // Fails before sync handler.
			wantErr:       true,
			expectedError: errors.New("failed to assert key to roleID"),
		},
		{
			name:     "GetRole returns error",
			inputKey: roleID,
			mockSetup: func(s *storagemocks.MockStorage) {
				// Mock GetRole to return an error.
				s.On("GetRole", roleIDStr).Return(nil, assert.AnError).Once()
			},
			useMockSync: false, // Fails before sync handler.
			wantErr:     true,  // Expect error from GetRole to be propagated.
		},
		{
			name:     "Sync handler returns error (mock sync)",
			inputKey: roleID,
			mockSetup: func(s *storagemocks.MockStorage) {
				// GetRole succeeds, providing the role that triggers mock failure.
				role := testRole(roleID, v1.RolePhaseCREATED)
				role.Metadata.Name = "sync-should-fail" // Condition for mockSyncHandler failure.
				s.On("GetRole", roleIDStr).Return(role, nil).Once()
			},
			useMockSync: true, // Use the mock handler.
			wantErr:     true, // Expect error from mock sync handler to be propagated.
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := &storagemocks.MockStorage{}
			if tt.mockSetup != nil {
				tt.mockSetup(mockStorage)
			}

			// Create controller using the helper.
			c := newTestRoleController(mockStorage)

			// Override syncHandler if the test case requires the mock.
			if tt.useMockSync {
				c.syncHandler = mockSyncHandler
			}

			// Directly call the Reconcile method.
			err := c.Reconcile(tt.inputKey)

			// Assertions.
			if tt.wantErr {
				assert.Error(t, err)
				if tt.expectedError != nil {
					// Use Contains for checking wrapped errors.
					assert.Contains(t, err.Error(), tt.expectedError.Error())
				}
			} else {
				assert.NoError(t, err)
			}
			// Verify mock expectations.
			mockStorage.AssertExpectations(t)
		})
	}
}
</output_controller_go_test>

Finally, you should response in the following YAML format, and handle multi-line strings correctly:

<response_format>
\`\`\`yaml
controller_go_impl: $output_controller_go_impl
controller_go_test: $output_controller_go_test
\`\`\`
</response_format>
`;
